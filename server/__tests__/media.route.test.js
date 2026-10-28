import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
vi.mock("../models/user.model.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("../utils/cloudinary.js", () => ({ createCloudinaryUploadSignature: vi.fn(() => ({ apiKey: "public-key", cloudName: "test", signature: "signed" })), getCloudinaryResource: vi.fn(), readCloudinaryFileHeader: vi.fn(), uploadMedia: vi.fn() }));
import { User } from "../models/user.model.js";
import { getCloudinaryResource } from "../utils/cloudinary.js";
import media from "../routes/media.route.js";
let server, url;
beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("SECRET_KEY", "local-media-route-test-key");
    const app = express(); app.use(express.json()); app.use("/media", media);
    server = app.listen(0, "127.0.0.1"); await once(server, "listening");
    url = `http://127.0.0.1:${server.address().port}/media`;
});
afterEach(async () => { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); vi.unstubAllEnvs(); });
const post = (path, body, role) => {
    const userId = role === "student" ? "507f1f77bcf86cd799439011" : "507f1f77bcf86cd799439012";
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ role, status: "active" }) });
    const headers = { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${jwt.sign({ userId }, process.env.SECRET_KEY)}` } : {}) };
    return fetch(url + path, { method: "POST", headers, body: JSON.stringify(body) });
};
it("requires a real authenticated session before signing", async () => {
    expect((await post("/upload-signature", { purpose: "profile" })).status).toBe(401);
});
it("allows a student's own avatar and rejects teaching uploads", async () => {
    const response = await post("/upload-signature", { purpose: "profile" }, "student");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { data } = await response.json();
    expect(data.params.public_id).toMatch(/^lms\/profile-photos\/507f1f77bcf86cd799439011\//);
    expect(data.apiSecret).toBeUndefined();
    expect((await post("/upload-signature", { purpose: "attachment" }, "student")).status).toBe(403);
});
it("signs protected PDF uploads for instructors", async () => {
    const response = await post("/upload-signature", { purpose: "attachment", type: "upload", public_id: "other-user/file" }, "instructor");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.resourceType).toBe("raw");
    expect(data.params.type).toBe("authenticated");
    expect(data.params.public_id).toMatch(/^lms\/lecture-attachments\/507f1f77bcf86cd799439012\//);
});
it("rejects cross-account quiz IDs without asking the provider", async () => {
    const response = await post("/verify-quiz-image", { publicId: "lms/quiz-questions/another-user/06360d51-8883-4d12-97df-18e2af5da979" }, "instructor");
    expect(response.status).toBe(400);
    expect(getCloudinaryResource).not.toHaveBeenCalled();
});
