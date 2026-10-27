import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/adminInvitation.model.js", () => ({ AdminInvitation: {
    create: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), findByIdAndDelete: vi.fn(), findByIdAndUpdate: vi.fn(),
} }));
vi.mock("../models/auditLog.model.js", () => ({ AuditLog: { create: vi.fn() } }));
vi.mock("../models/user.model.js", () => ({ User: { findOne: vi.fn(), findByIdAndUpdate: vi.fn() } }));
vi.mock("../utils/sendEmail.js", () => ({ sendEmail: vi.fn() }));

import { AdminInvitation } from "../models/adminInvitation.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { createAdminInvitation, acceptAdminInvitation } from "../controllers/admin.controller.js";

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

beforeEach(() => {
    vi.resetAllMocks();
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL = "http://localhost:5173";
});

describe("admin invitations", () => {
    it("requires a registered account", async () => {
        User.findOne.mockResolvedValue(null);
        const res = response();
        await createAdminInvitation({ id: "admin", body: { email: "new@example.com" } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(AdminInvitation.create).not.toHaveBeenCalled();
    });

    it("creates a one-day, hashed invitation for an existing account", async () => {
        User.findOne.mockResolvedValue({ role: "student", status: "active", emailVerified: true });
        AdminInvitation.create.mockResolvedValue({ _id: "invite-1" });
        sendEmail.mockResolvedValue({ sent: true });
        AuditLog.create.mockResolvedValue({});
        const res = response();
        await createAdminInvitation({ id: "admin", ip: "127.0.0.1", body: { email: " Person@Example.com " } }, res);
        expect(AdminInvitation.create).toHaveBeenCalledWith(expect.objectContaining({ email: "person@example.com", invitedBy: "admin", tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
        expect(sendEmail).toHaveBeenCalledOnce();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("rejects acceptance from a different signed-in email", async () => {
        AdminInvitation.findOne.mockResolvedValue({ _id: "invite-1", email: "invited@example.com" });
        const res = response();
        await acceptAdminInvitation({ params: { token: "abc" }, user: { email: "other@example.com" } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("promotes only after atomically claiming a valid invitation", async () => {
        AdminInvitation.findOne.mockResolvedValue({ _id: "invite-1", email: "invited@example.com" });
        AdminInvitation.findOneAndUpdate.mockResolvedValue({ _id: "invite-1" });
        User.findByIdAndUpdate.mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: "user-1", role: "admin" }) });
        AuditLog.create.mockResolvedValue({});
        const res = response();
        await acceptAdminInvitation({ id: "user-1", params: { token: "abc" }, user: { email: "invited@example.com" } }, res);
        expect(AdminInvitation.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ acceptedAt: null }), expect.anything(), expect.anything());
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user-1", { role: "admin" }, { new: true });
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
