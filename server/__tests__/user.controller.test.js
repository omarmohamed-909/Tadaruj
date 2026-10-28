import { vi, describe, it, expect, beforeEach } from "vitest";
vi.mock("../utils/directUploads.js", () => ({ verifyDirectUpload: vi.fn() }));
import { verifyDirectUpload } from "../utils/directUploads.js";

vi.mock("../models/user.model.js", () => ({
    User: {
        findOne: vi.fn(),
        create: vi.fn(),
        findById: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        find: vi.fn(),
    },
}));

vi.mock("../models/course.model.js", () => ({
    Course: { findById: vi.fn(), exists: vi.fn() },
}));

vi.mock("../models/coursePurchase.model.js", () => ({
    CoursePurchase: { find: vi.fn() },
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn().mockResolvedValue("hashed"),
        compare: vi.fn(),
    },
}));

vi.mock("jsonwebtoken", () => ({
    default: {
        sign: vi.fn().mockReturnValue("token123"),
        verify: vi.fn(),
    },
}));

vi.mock("../utils/generateToken.js", () => ({
    generateToken: vi.fn(),
}));

vi.mock("../utils/cloudinary.js", () => ({
    uploadMedia: vi.fn(),
    deleteMediaFromCloudinary: vi.fn(),
}));

vi.mock("../utils/sendEmail.js", () => ({
    sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import { uploadMedia } from "../utils/cloudinary.js";
import {
    register,
    login,
    logout,
    getUserProfile,
    updateProfile,
    forgotPassword,
    verifyEmail,
    resetPassword,
} from "../controllers/user.controller.js";

beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_DEV_RESET_LINKS;
    delete process.env.ALLOW_DEV_VERIFICATION_LINKS;
    process.env.SECRET_KEY = "test-secret";
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL = "http://localhost:5173";
});

const makeReq = (overrides = {}) => ({
    body: {},
    params: {},
    id: null,
    user: null,
    file: null,
    ...overrides,
});

const makeRes = () => {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
    };
    return res;
};

// ─── register ────────────────────────────────────────────────────────────────

describe("register", () => {
    it("rejects malformed email and short passwords", async () => {
        for (const body of [
            { name: "Alice", email: "not-an-email", password: "password123" },
            { name: "Alice", email: "alice@test.com", password: "short" },
        ]) {
            const res = makeRes();
            await register(makeReq({ body }), res);
            expect(res.status).toHaveBeenCalledWith(400);
        }
        expect(User.create).not.toHaveBeenCalled();
    });
    it("returns 400 when fields are missing", async () => {
        const req = makeReq({ body: { name: "Alice" } });
        const res = makeRes();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it("returns 400 when user already exists", async () => {
        const req = makeReq({
            body: { name: "Alice", email: "a@test.com", password: "password123" },
        });
        const res = makeRes();
        User.findOne.mockResolvedValue({ _id: "u1" });

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "User already exist with this email." })
        );
    });

    it("creates user and returns 201 on success", async () => {
        const req = makeReq({
            body: { name: "Alice", email: "new@test.com", password: "password123" },
        });
        const res = makeRes();
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ _id: "u2", name: "Alice", email: "new@test.com", save: vi.fn().mockResolvedValue(true) });

        await register(req, res);

        expect(User.create).toHaveBeenCalled();
        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: false }));
        expect(sendEmail).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
        expect(res.json.mock.calls[0][0].verificationUrl).toBeUndefined();
    });

    it("returns a verification shortcut only with explicit localhost opt-in", async () => {
        process.env.ALLOW_DEV_VERIFICATION_LINKS = "true";
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ _id: "u2", name: "Alice", email: "new@test.com", save: vi.fn().mockResolvedValue(true) });
        const req = makeReq({ body: { name: "Alice", email: "new@test.com", password: "password123" } });
        const localRes = makeRes();
        await register(req, localRes);
        expect(localRes.json.mock.calls[0][0].verificationUrl).toContain("http://localhost:5173/verify-email/");

        process.env.FRONTEND_URL = "https://example.com";
        const deployedRes = makeRes();
        await register(req, deployedRes);
        expect(deployedRes.json.mock.calls[0][0].verificationUrl).toBeUndefined();
    });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe("login", () => {
    it("returns 400 when fields are missing", async () => {
        const req = makeReq({ body: { email: "a@test.com" } });
        const res = makeRes();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when user is not found", async () => {
        const req = makeReq({
            body: { email: "unknown@test.com", password: "pass" },
        });
        const res = makeRes();
        User.findOne.mockResolvedValue(null);

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Incorect email or password" })
        );
    });

    it("returns 400 when password does not match", async () => {
        const req = makeReq({
            body: { email: "user@test.com", password: "wrongpass" },
        });
        const res = makeRes();
        User.findOne.mockResolvedValue({ _id: "u1", password: "hashed" });
        bcrypt.compare.mockResolvedValue(false);

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("calls generateToken on successful login", async () => {
        const req = makeReq({
            body: { email: "user@test.com", password: "correctpass" },
        });
        const res = makeRes();
        const fakeUser = { _id: "u1", name: "Alice", password: "hashed", emailVerified: true, status: "active" };
        User.findOne.mockResolvedValue(fakeUser);
        bcrypt.compare.mockResolvedValue(true);

        await login(req, res);

        expect(generateToken).toHaveBeenCalledWith(
            res,
            fakeUser,
            `welcome back ${fakeUser.name}`
        );
    });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe("logout", () => {
    it("clears cookie and returns 200", async () => {
        const req = makeReq();
        const res = makeRes();

        await logout(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.cookie).toHaveBeenCalledWith(
            "token",
            "",
            expect.objectContaining({ expires: expect.any(Date) })
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });
});

// ─── getUserProfile ───────────────────────────────────────────────────────────

describe("getUserProfile", () => {
    it("returns 404 when user is not found", async () => {
        const req = makeReq({ id: "u999" });
        const res = makeRes();
        User.findById.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            populate: vi.fn().mockResolvedValue(null),
        });

        await getUserProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 200 with user on success", async () => {
        const fakeUser = { _id: "u1", name: "Alice" };
        const req = makeReq({ id: "u1" });
        const res = makeRes();
        User.findById.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            populate: vi.fn().mockResolvedValue(fakeUser),
        });

        await getUserProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, user: fakeUser })
        );
    });
});

// ─── forgotPassword ───────────────────────────────────────────────────────────

describe("forgotPassword", () => {
    it("returns 400 when email is missing", async () => {
        const req = makeReq({ body: {} });
        const res = makeRes();

        await forgotPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 200 with safe message when user is not found", async () => {
        const req = makeReq({ body: { email: "ghost@test.com" } });
        const res = makeRes();
        User.findOne.mockResolvedValue(null);

        await forgotPassword(req, res);

        // Should not reveal whether account exists
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });

    it("sends a reset email without exposing the link in the response", async () => {
        const fakeUser = {
            _id: "u1",
            email: "user@test.com",
            resetPasswordExpires: null,
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({ body: { email: "user@test.com" } });
        const res = makeRes();
        User.findOne.mockResolvedValue(fakeUser);

        await forgotPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.success).toBe(true);
        expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@test.com" }));
        expect(jsonArg.resetPath).toBeUndefined();
        expect(jsonArg.resetUrl).toBeUndefined();
    });

    it("blocks login until the email is verified", async () => {
        const res = makeRes();
        User.findOne.mockResolvedValue({ _id:"u1", password:"hashed", emailVerified:false, status:"active" });
        bcrypt.compare.mockResolvedValue(true);
        await login(makeReq({ body:{ email:"user@test.com", password:"password123" } }), res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(generateToken).not.toHaveBeenCalled();
    });

    it("returns the reset URL only when local development explicitly opts in", async () => {
        process.env.ALLOW_DEV_RESET_LINKS = "true";
        const fakeUser = { _id: "u1", email: "user@test.com", save: vi.fn().mockResolvedValue(true) };
        User.findOne.mockResolvedValue(fakeUser);
        const res = makeRes();

        await forgotPassword(makeReq({ body: { email: "user@test.com" } }), res);

        const jsonArg = res.json.mock.calls[0][0];
        expect(typeof jsonArg.resetPath).toBe("string");
        expect(jsonArg.resetPath).toMatch(/^\/reset-password\//);
    });

    it("never exposes a reset link in production even with the local flag", async () => {
        process.env.NODE_ENV = "production";
        process.env.ALLOW_DEV_RESET_LINKS = "true";
        User.findOne.mockResolvedValue({ _id: "u1", email: "user@test.com", save: vi.fn().mockResolvedValue(true) });
        const res = makeRes();

        await forgotPassword(makeReq({ body: { email: "user@test.com" } }), res);

        expect(res.json.mock.calls[0][0].resetUrl).toBeUndefined();
    });
});

// ─── verifyEmail ──────────────────────────────────────────────────────────────

import jwt from "jsonwebtoken";

describe("verifyEmail", () => {
    it("returns 400 for wrong-purpose token", async () => {
        const req = makeReq({ params: { token: "tok" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "reset-password", userId: "u1", email: "a@b.com" });

        await verifyEmail(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when user not found or email mismatch", async () => {
        const req = makeReq({ params: { token: "tok" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "verify-email", userId: "u1", email: "a@b.com" });
        User.findById.mockResolvedValue(null);

        await verifyEmail(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 200 with alreadyVerified flag when already verified", async () => {
        const req = makeReq({ params: { token: "tok" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "verify-email", userId: "u1", email: "a@b.com" });
        User.findById.mockResolvedValue({ _id: "u1", email: "a@b.com", emailVerified: true });

        await verifyEmail(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ alreadyVerified: true })
        );
    });

    it("verifies email successfully", async () => {
        const fakeUser = {
            _id: "u1",
            email: "a@b.com",
            emailVerified: false,
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({ params: { token: "tok" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "verify-email", userId: "u1", email: "a@b.com" });
        User.findById.mockResolvedValue(fakeUser);

        await verifyEmail(req, res);

        expect(fakeUser.emailVerified).toBe(true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe("resetPassword", () => {
    it("rejects a short new password", async () => {
        const res = makeRes();
        await resetPassword(makeReq({ params: { token: "tok" }, body: { password: "short" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(jwt.verify).not.toHaveBeenCalled();
    });
    it("returns 400 when password is missing", async () => {
        const req = makeReq({ params: { token: "tok" }, body: {} });
        const res = makeRes();

        await resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for wrong-purpose token", async () => {
        const req = makeReq({ params: { token: "tok" }, body: { password: "newpass" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "verify-email", userId: "u1" });

        await resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when reset token is expired", async () => {
        const req = makeReq({ params: { token: "tok" }, body: { password: "newpass" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "reset-password", userId: "u1" });
        const expiredDate = new Date(Date.now() - 1000);
        User.findById.mockResolvedValue({
            _id: "u1",
            resetPasswordExpires: expiredDate,
        });

        await resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("resets password successfully", async () => {
        const fakeUser = {
            _id: "u1",
            resetPasswordExpires: new Date(Date.now() + 60_000),
            password: "old",
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({ params: { token: "tok" }, body: { password: "newpass123" } });
        const res = makeRes();
        jwt.verify.mockReturnValue({ purpose: "reset-password", userId: "u1" });
        User.findById.mockResolvedValue(fakeUser);

        await resetPassword(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith("newpass123", 10);
        expect(fakeUser.resetPasswordExpires).toBeNull();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ─── updateProfile ─────────────────────────────────────────────────────────

describe("updateProfile", () => {
    it("saves an independently verified direct avatar", async () => {
        User.findById.mockResolvedValue({ _id: "u1", name: "Amal", role: "student", photoUrl: "" });
        User.findByIdAndUpdate.mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: "u1" }) });
        verifyDirectUpload.mockResolvedValue({ public_id: "owned", secure_url: "verified-avatar-url" });
        const res = makeRes();
        await updateProfile(makeReq({ id: "u1", body: { photoAssetId: "owned" } }), res);
        expect(verifyDirectUpload).toHaveBeenCalledWith("owned", "profile", "u1");
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", expect.objectContaining({ photoUrl: "verified-avatar-url" }), { new: true });
        expect(uploadMedia).not.toHaveBeenCalled();
    });
    it("does not change a profile when its avatar belongs to another user", async () => {
        User.findById.mockResolvedValue({ _id: "u1", name: "Amal", role: "student", photoUrl: "" });
        verifyDirectUpload.mockRejectedValue(Object.assign(new Error("Invalid or unowned upload."), { uploadStatus: 400 }));
        const res = makeRes();
        await updateProfile(makeReq({ id: "u1", body: { photoAssetId: "other-user-asset" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    it("normalizes an instructor's international WhatsApp number", async () => {
        User.findById.mockResolvedValue({ _id: "u1", name: "Amal", role: "instructor", photoUrl: "" });
        User.findByIdAndUpdate.mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: "u1" }) });
        const res = makeRes();
        await updateProfile(makeReq({ id: "u1", body: { instructorWhatsapp: "+20 100 123 4567" } }), res);
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", expect.objectContaining({ instructorWhatsapp: "+201001234567" }), { new: true });
    });

    it("does not allow removing WhatsApp while paid courses are published", async () => {
        User.findById.mockResolvedValue({ _id: "u1", name: "Amal", role: "instructor", instructorWhatsapp: "+201001234567" });
        Course.exists.mockResolvedValue(true);
        const res = makeRes();
        await updateProfile(makeReq({ id: "u1", body: { instructorWhatsapp: "" } }), res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    it("updates an instructor's public bio and subjects", async () => {
        User.findById.mockResolvedValue({ _id: "u1", name: "Amal", role: "instructor", photoUrl: "" });
        User.findByIdAndUpdate.mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: "u1", name: "Amal" }) });
        const req = makeReq({ id: "u1", body: { name: "Amal", instructorBio: "  I teach science.  ", instructorSubjects: "علوم، Science, Biology, Science" } });
        const res = makeRes();

        await updateProfile(req, res);

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", expect.objectContaining({
            instructorBio: "I teach science.",
            instructorSubjects: ["علوم", "Science", "Biology"],
        }), { new: true });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects invalid instructor bio before uploading a photo", async () => {
        User.findById.mockResolvedValue({ _id: "u1", name: "Amal", role: "instructor", photoUrl: "old.jpg" });
        const req = makeReq({ id: "u1", body: { instructorBio: "x".repeat(601) }, file: { buffer: Buffer.from("photo") } });
        const res = makeRes();

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(uploadMedia).not.toHaveBeenCalled();
    });
    it("returns 404 when user is not found", async () => {
        const req = makeReq({ id: "u999", body: { name: "New Name" } });
        const res = makeRes();
        User.findById.mockResolvedValue(null);

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when password change has missing fields", async () => {
        const req = makeReq({
            id: "u1",
            body: { currentPassword: "old", newPassword: "new" },
        });
        const res = makeRes();
        User.findById.mockResolvedValue({
            _id: "u1",
            name: "Alice",
            password: "hashed",
            photoUrl: "",
        });

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it("returns 400 when current password is incorrect", async () => {
        const req = makeReq({
            id: "u1",
            body: { currentPassword: "wrong", newPassword: "new123", confirmPassword: "new123" },
        });
        const res = makeRes();
        User.findById.mockResolvedValue({
            _id: "u1",
            name: "Alice",
            password: "hashed",
            photoUrl: "",
        });
        bcrypt.compare.mockResolvedValue(false);

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Current password is incorrect." })
        );
    });

    it("returns 400 when new password is too short", async () => {
        const req = makeReq({
            id: "u1",
            body: { currentPassword: "old", newPassword: "123", confirmPassword: "123" },
        });
        const res = makeRes();
        User.findById.mockResolvedValue({
            _id: "u1",
            name: "Alice",
            password: "hashed",
            photoUrl: "",
        });
        bcrypt.compare.mockResolvedValue(true);

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "New password must be at least 8 characters." })
        );
    });

    it("returns 400 when new password and confirm password do not match", async () => {
        const req = makeReq({
            id: "u1",
            body: { currentPassword: "old", newPassword: "newpassword", confirmPassword: "diff" },
        });
        const res = makeRes();
        User.findById.mockResolvedValue({
            _id: "u1",
            name: "Alice",
            password: "hashed",
            photoUrl: "",
        });
        bcrypt.compare.mockResolvedValue(true);

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Confirm password does not match." })
        );
    });

    it("updates name successfully without password change", async () => {
        const updatedUser = { _id: "u1", name: "New Name", photoUrl: "" };
        const req = makeReq({ id: "u1", body: { name: "New Name" } });
        const res = makeRes();
        User.findById.mockResolvedValue({
            _id: "u1",
            name: "Alice",
            password: "hashed",
            photoUrl: "",
        });
        User.findByIdAndUpdate.mockReturnValue({
            select: vi.fn().mockResolvedValue(updatedUser),
        });

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, user: updatedUser })
        );
    });
});
