import { vi, describe, it, expect, beforeEach } from "vitest";
import authorizeRoles from "../middlewares/authorizeRoles.js";

beforeEach(() => {
    vi.clearAllMocks();
});

const makeRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
});

describe("authorizeRoles middleware", () => {
    it("returns 401 when req.user is not set", () => {
        const middleware = authorizeRoles("instructor");
        const req = {};
        const res = makeRes();
        const next = vi.fn();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "User not authenticated." })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 when user role is not in allowed roles", () => {
        const middleware = authorizeRoles("instructor");
        const req = { user: { role: "student" } };
        const res = makeRes();
        const next = vi.fn();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("calls next() when user role is allowed", () => {
        const middleware = authorizeRoles("instructor");
        const req = { user: { role: "instructor" } };
        const res = makeRes();
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it("allows access when user has one of multiple allowed roles", () => {
        const middleware = authorizeRoles("instructor", "admin");
        const req = { user: { role: "admin" } };
        const res = makeRes();
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("denies access when user role is not in multiple allowed roles", () => {
        const middleware = authorizeRoles("instructor", "admin");
        const req = { user: { role: "student" } };
        const res = makeRes();
        const next = vi.fn();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
