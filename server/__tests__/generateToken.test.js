import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/generateToken.js";

// generateToken relies on process.env.SECRET_KEY and builds a JWT
const SECRET = "test-secret";

beforeEach(() => {
    process.env.SECRET_KEY = SECRET;
    process.env.NODE_ENV = "test";
});

afterEach(() => {
    vi.restoreAllMocks();
});

const makeRes = () => {
    const res = {
        status: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    return res;
};

describe("generateToken", () => {
    it("sets a token cookie and returns 200", () => {
        const res = makeRes();
        const user = { _id: "user123", name: "Alice", password: "hashed" };

        generateToken(res, user, "Welcome!");

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.cookie).toHaveBeenCalledWith(
            "token",
            expect.any(String),
            expect.objectContaining({ httpOnly: true })
        );
    });

    it("returns a valid JWT in the response body", () => {
        const res = makeRes();
        const user = { _id: "user123", name: "Alice", password: "hashed" };

        generateToken(res, user, "Welcome!");

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.success).toBe(true);
        expect(jsonArg.message).toBe("Welcome!");
        expect(typeof jsonArg.token).toBe("string");

        const decoded = jwt.verify(jsonArg.token, SECRET);
        expect(decoded.userId).toBe("user123");
        expect(decoded.purpose).toBe("access");
    });

    it("strips the password from the user in the response", () => {
        const res = makeRes();
        const user = { _id: "u1", name: "Bob", password: "secret" };

        generateToken(res, user, "ok");

        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.user.password).toBeUndefined();
        expect(jsonArg.user.name).toBe("Bob");
    });

    it("sets secure cookie flag in production", () => {
        process.env.NODE_ENV = "production";
        const res = makeRes();
        const user = { _id: "u2", name: "Carol", password: "p" };

        generateToken(res, user, "ok");

        const cookieOptions = res.cookie.mock.calls[0][2];
        expect(cookieOptions.secure).toBe(true);
        expect(cookieOptions.sameSite).toBe("none");
    });

    it("sets non-secure cookie in development", () => {
        process.env.NODE_ENV = "development";
        const res = makeRes();
        const user = { _id: "u3", name: "Dave", password: "p" };

        generateToken(res, user, "ok");

        const cookieOptions = res.cookie.mock.calls[0][2];
        expect(cookieOptions.secure).toBe(false);
        expect(cookieOptions.sameSite).toBe("lax");
    });
});
