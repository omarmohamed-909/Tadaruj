import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies before importing the middleware
vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn(),
    },
}));

vi.mock("../models/user.model.js", () => ({
    User: {
        findById: vi.fn(),
    },
}));

import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

beforeEach(() => {
    process.env.SECRET_KEY = "test-secret";
    vi.clearAllMocks();
});

const makeReq = (overrides = {}) => ({
    headers: {},
    cookies: {},
    ...overrides,
});

const makeRes = () => {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    return res;
};

describe("isAuthenticated middleware", () => {
    it("returns 401 when no token is provided", async () => {
        const req = makeReq();
        const res = makeRes();
        const next = vi.fn();

        await isAuthenticated(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "User not authenticated" })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when token is invalid", async () => {
        const req = makeReq({ cookies: { token: "bad.token" } });
        const res = makeRes();
        const next = vi.fn();

        jwt.verify.mockImplementation(() => {
            throw new Error("invalid token");
        });

        await isAuthenticated(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it.each(["reset-password", "verify-email"])("rejects a %s token as a session", async (purpose) => {
        const req = makeReq({ headers: { authorization: "Bearer purpose.token" } });
        const res = makeRes();
        const next = vi.fn();
        jwt.verify.mockReturnValue({ userId: "u1", purpose });

        await isAuthenticated(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(User.findById).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    it("allows an access token", async () => {
        const req = makeReq({ headers: { authorization: "Bearer access.token" } });
        const res = makeRes();
        const next = vi.fn();
        jwt.verify.mockReturnValue({ userId: "u1", purpose: "access" });
        User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: "u1", role: "student" }) });

        await isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });

    it("returns 401 when user is not found in DB", async () => {
        const req = makeReq({ cookies: { token: "valid.token" } });
        const res = makeRes();
        const next = vi.fn();

        jwt.verify.mockReturnValue({ userId: "u1" });
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(null),
        });

        await isAuthenticated(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "User not found" })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("calls next() and attaches user when cookie token is valid", async () => {
        const req = makeReq({ cookies: { token: "valid.token" } });
        const res = makeRes();
        const next = vi.fn();
        const fakeUser = { _id: "u1", name: "Alice", role: "student" };

        jwt.verify.mockReturnValue({ userId: "u1" });
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(fakeUser),
        });

        await isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.id).toBe("u1");
        expect(req.user).toBe(fakeUser);
    });

    it("calls next() when a valid Bearer token is provided in Authorization header", async () => {
        const req = makeReq({
            headers: { authorization: "Bearer valid.token" },
            cookies: {},
        });
        const res = makeRes();
        const next = vi.fn();
        const fakeUser = { _id: "u2", name: "Bob", role: "instructor" };

        jwt.verify.mockReturnValue({ userId: "u2" });
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(fakeUser),
        });

        await isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.id).toBe("u2");
    });

    it("prefers cookie token over Bearer token", async () => {
        const req = makeReq({
            headers: { authorization: "Bearer bearer.token" },
            cookies: { token: "cookie.token" },
        });
        const res = makeRes();
        const next = vi.fn();
        const fakeUser = { _id: "u3", name: "Eve" };

        jwt.verify.mockReturnValue({ userId: "u3" });
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(fakeUser),
        });

        await isAuthenticated(req, res, next);

        // First call should be for the cookie token
        expect(jwt.verify.mock.calls[0][0]).toBe("cookie.token");
        expect(next).toHaveBeenCalled();
    });
});
