import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

vi.mock("../models/user.model.js", () => ({ User: { findOne: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock("../models/googleLoginAttempt.model.js", () => ({ GoogleLoginAttempt: { create: vi.fn(), exists: vi.fn(), findOneAndDelete: vi.fn() } }));
vi.mock("../utils/googleIdentity.js", async (original) => ({ ...await original(), verifyGoogleCredential: vi.fn() }));
vi.mock("../utils/generateToken.js", () => ({ generateToken: vi.fn() }));
vi.mock("../controllers/user.controller.js", () => ({ sendVerificationEmail: vi.fn().mockResolvedValue({ emailSent: true }), buildVerificationResponse: vi.fn((value) => value) }));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

import { User } from "../models/user.model.js";
import { GoogleLoginAttempt } from "../models/googleLoginAttempt.model.js";
import { verifyGoogleCredential } from "../utils/googleIdentity.js";
import { generateToken } from "../utils/generateToken.js";
import { sendVerificationEmail } from "../controllers/user.controller.js";
import bcrypt from "bcryptjs";
import { googleChallenge, googleConfig, googleLogin } from "../controllers/googleAuth.controller.js";

const nonce = "a".repeat(64);
const clientId = "123-test.apps.googleusercontent.com";
const identity = { sub: "google-subject", email: "student@gmail.com", email_verified: true, nonce, name: "Student" };
const req = (body = {}, origin = "https://academy.example.test") => ({ body, headers: { origin }, is: () => "application/json" });
const res = () => ({ set: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() });
const body = { credential: "google-id-token", nonce };
const user = { _id: "existing", email: identity.email, name: "Student", status: "active", emailVerified: true, googleId: identity.sub, role: "student" };
const signIn = async (request = req(body)) => { const response = res(); await googleLogin(request, response); return response; };
const expectCode = (response, status, code) => {
  expect(response.status).toHaveBeenCalledWith(status);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code }));
  expect(generateToken).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GOOGLE_CLIENT_ID", clientId);
  vi.stubEnv("FRONTEND_URL", "https://academy.example.test");
  vi.stubEnv("FRONTEND_URLS", "");
  vi.stubEnv("NODE_ENV", "production");
  GoogleLoginAttempt.exists.mockResolvedValue(true);
  GoogleLoginAttempt.findOneAndDelete.mockResolvedValue({ _id: "attempt" });
  verifyGoogleCredential.mockResolvedValue({ ...identity });
  User.findOne.mockResolvedValue(null);
  User.create.mockResolvedValue({ ...user });
  bcrypt.compare.mockResolvedValue(true);
  sendVerificationEmail.mockResolvedValue({ emailSent: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("Google sign-in boundary", () => {
  it("disables the method when a real client ID is not configured", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const config = res(); googleConfig({}, config);
    expect(config.json).toHaveBeenCalledWith({ enabled: false });
    expectCode(await signIn(), 503, "GOOGLE_UNAVAILABLE");
  });
  it("creates a short-lived nonce and stores only its hash, origin and audience", async () => {
    const response = res(); await googleChallenge(req({}), response);
    const challenge = response.json.mock.calls[0][0];
    expect(challenge.nonce).toMatch(/^[a-f0-9]{64}$/);
    expect(challenge.clientId).toBe(clientId);
    expect(new Date(challenge.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(300000);
    expect(GoogleLoginAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ _id: createHash("sha256").update(challenge.nonce).digest("hex"), origin: "https://academy.example.test", clientId }));
    expect(response.set).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it.each([undefined, "null", "https://evil.example", "https://academy.example.test.evil.example", "http://localhost:5188"])("rejects untrusted or missing origin in production: %s", async (origin) => {
    const request = req(body); request.headers.origin = origin;
    expectCode(await signIn(request), 403, "GOOGLE_ORIGIN_REJECTED");
    expect(verifyGoogleCredential).not.toHaveBeenCalled();
  });
  it("rejects cross-site form submissions even with a trusted origin", async () => {
    expectCode(await signIn({ ...req(body), is: () => false }), 403, "GOOGLE_ORIGIN_REJECTED");
  });
  it("allows the explicitly configured second frontend", async () => {
    vi.stubEnv("FRONTEND_URLS", "https://other.example.test");
    await signIn(req(body, "https://other.example.test"));
    expect(generateToken).toHaveBeenCalled();
  });
  it("allows loopback development without allowing it in production", async () => {
    vi.stubEnv("NODE_ENV", "test"); await signIn(req(body, "http://localhost:5188"));
    expect(generateToken).toHaveBeenCalled();
  });
  it.each([{ nonce, credential: {} }, { nonce: "short", credential: "token" }, { nonce, credential: "x".repeat(12001) }])("rejects malformed inputs", async (input) => {
    expectCode(await signIn(req(input)), 400, "GOOGLE_INVALID_CREDENTIAL");
    expect(verifyGoogleCredential).not.toHaveBeenCalled();
  });
  it("rejects expired attempts before verifying the Google token", async () => {
    GoogleLoginAttempt.exists.mockResolvedValue(false);
    expectCode(await signIn(), 401, "GOOGLE_EXPIRED");
    expect(verifyGoogleCredential).not.toHaveBeenCalled();
  });
  it("delegates signature, issuer, expiry and audience verification to the official library wrapper", async () => {
    verifyGoogleCredential.mockRejectedValue(new Error("invalid token"));
    expectCode(await signIn(), 401, "GOOGLE_INVALID_CREDENTIAL");
    expect(verifyGoogleCredential).toHaveBeenCalledWith(body.credential, clientId);
    expect(User.findOne).not.toHaveBeenCalled();
  });
  it.each([{ nonce: "b".repeat(64) }, { sub: "" }, { email_verified: false }, { email: "invalid" }])("rejects mismatched nonce or invalid identity claims", async (overrides) => {
    verifyGoogleCredential.mockResolvedValue({ ...identity, ...overrides });
    expectCode(await signIn(), 401, "GOOGLE_INVALID_CREDENTIAL");
  });
  it("does not issue a session if another request already consumed the nonce", async () => {
    GoogleLoginAttempt.findOneAndDelete.mockResolvedValue(null);
    expectCode(await signIn(), 401, "GOOGLE_EXPIRED");
    expect(User.create).not.toHaveBeenCalled();
  });
  it("creates only a student with no invented password or elevated role", async () => {
    await signIn(req({ ...body, role: "admin", status: "active", email: "attacker@example.test" }));
    expect(User.create).toHaveBeenCalledWith({ name: "Student", email: identity.email, googleId: identity.sub, role: "student", status: "active", emailVerified: true });
    expect(generateToken).toHaveBeenCalledWith(expect.anything(), user, expect.any(String));
  });
  it("requires mailbox verification for Google accounts with third-party email", async () => {
    verifyGoogleCredential.mockResolvedValue({ ...identity, email: "student@example.test" });
    User.create.mockResolvedValue({ ...user, email: "student@example.test", emailVerified: false });
    const response = await signIn();
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: false }));
    expect(sendVerificationEmail).toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ requiresEmailVerification: true }));
    expect(generateToken).not.toHaveBeenCalled();
  });
  it("recognizes verified Google Workspace mailboxes", async () => {
    verifyGoogleCredential.mockResolvedValue({ ...identity, email: "student@school.example", hd: "school.example" });
    await signIn();
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: true }));
  });
  it("finds returning users by stable Google subject even if their Google email changed", async () => {
    User.findOne.mockResolvedValue({ ...user, email: "original@gmail.com", role: "instructor" });
    await signIn();
    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(User.findOne).toHaveBeenCalledWith({ googleId: identity.sub });
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(generateToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ role: "instructor", email: "original@gmail.com" }), expect.anything());
  });
  it("blocks suspended users", async () => {
    User.findOne.mockResolvedValue({ ...user, status: "suspended" });
    expectCode(await signIn(), 403, "ACCOUNT_SUSPENDED");
  });
  it("never auto-links a matching email to an existing password account", async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...user, googleId: undefined, password: "hash", role: "admin" });
    expectCode(await signIn(), 409, "GOOGLE_LINK_REQUIRED");
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(GoogleLoginAttempt.findOneAndDelete).not.toHaveBeenCalled();
  });
  it("blocks linking to an unverified account even with a matching email", async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...user, googleId: undefined, emailVerified: false });
    expectCode(await signIn(), 403, "GOOGLE_VERIFY_EMAIL");
  });
  it("rejects the wrong linking password without consuming the challenge", async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...user, googleId: undefined, password: "hash" });
    bcrypt.compare.mockResolvedValue(false);
    expectCode(await signIn(req({ ...body, password: "wrong" })), 401, "GOOGLE_LINK_PASSWORD_INVALID");
    expect(GoogleLoginAttempt.findOneAndDelete).not.toHaveBeenCalled();
  });
  it("links only after password confirmation and preserves role and courses", async () => {
    const existing = { ...user, googleId: undefined, password: "hash", role: "instructor", enrolledCourses: ["course"] };
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    User.findOneAndUpdate.mockResolvedValue({ ...existing, googleId: identity.sub });
    await signIn(req({ ...body, password: "correct" }));
    expect(bcrypt.compare).toHaveBeenCalledWith("correct", "hash");
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: existing._id, password: "hash", emailVerified: true }), { $set: { googleId: identity.sub } }, expect.anything());
    expect(generateToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ role: "instructor", enrolledCourses: ["course"] }), expect.anything());
  });
  it("rejects linking a different Google identity to an already-linked email", async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...user, googleId: "other-subject" });
    expectCode(await signIn(), 409, "GOOGLE_ACCOUNT_CONFLICT");
  });
  it("handles uniqueness races without creating a second identity or issuing a session", async () => {
    User.create.mockRejectedValue({ code: 11000 });
    expectCode(await signIn(), 409, "GOOGLE_ACCOUNT_CONFLICT");
  });
});
