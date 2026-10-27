import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { User } from "../models/user.model.js";
import { GoogleLoginAttempt } from "../models/googleLoginAttempt.model.js";
import { googleChallenge, googleLogin } from "../controllers/googleAuth.controller.js";
import { login } from "../controllers/user.controller.js";
import { verifyGoogleCredential } from "../utils/googleIdentity.js";

vi.mock("../utils/googleIdentity.js", async (original) => ({ ...await original(), verifyGoogleCredential: vi.fn() }));
vi.mock("../utils/sendEmail.js", () => ({ sendEmail: vi.fn().mockResolvedValue({ sent: true }) }));
const uri = process.env.TEST_GOOGLE_MONGO_URI;
const origin = "http://localhost:5188";
const request = (body = {}) => ({ body, headers: { origin }, is: () => "application/json" });
const response = () => ({ set: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), cookie: vi.fn().mockReturnThis() });
const payload = (res) => res.json.mock.calls.at(-1)?.[0];
const googleIdentity = (overrides = {}) => ({ sub: `google-${new mongoose.Types.ObjectId()}`, name: "Google Student", email: `${new mongoose.Types.ObjectId()}@gmail.com`, email_verified: true, ...overrides });

describe.skipIf(!uri)("Google authentication with isolated real MongoDB", () => {
  beforeAll(async () => {
    if (!/^mongodb:\/\/127\.0\.0\.1:27028\/tadaruj_test_[a-f0-9]+\?replicaSet=codex-test$/.test(uri)) throw new Error("Only a unique isolated local test database is allowed.");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    if ((await mongoose.connection.db.listCollections().toArray()).length) throw new Error("Test database must be empty.");
    await Promise.all([User.init(), GoogleLoginAttempt.init()]);
    vi.stubEnv("GOOGLE_CLIENT_ID", "123-test.apps.googleusercontent.com");
    vi.stubEnv("FRONTEND_URL", origin);
    vi.stubEnv("SECRET_KEY", "local-google-integration-test-only-secret");
    vi.stubEnv("NODE_ENV", "test");
  }, 20000);
  afterAll(async () => { vi.unstubAllEnvs(); await mongoose.disconnect(); });
  const attempt = async (identity) => {
    const res = response(); await googleChallenge(request(), res);
    const { nonce } = payload(res);
    const body = { nonce, credential: "Google verification is simulated at this boundary only." };
    verifyGoogleCredential.mockResolvedValue({ ...identity, nonce });
    return body;
  };
  const signIn = async (body) => { const res = response(); await googleLogin(request(body), res); return res; };

  it("creates a Google-only student and issues the normal session without exposing provider IDs", async () => {
    const identity = googleIdentity();
    const body = await attempt(identity);
    const res = await signIn({ ...body, role: "admin", password: "never-store-this" });
    expect(res.cookie).toHaveBeenCalledWith("token", expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect(payload(res).user.role).toBe("student");
    expect(payload(res).user.password).toBeUndefined();
    expect(payload(res).user.googleId).toBeUndefined();
    const stored = await User.findOne({ googleId: identity.sub });
    expect(stored.password).toBeUndefined();
    expect(stored.emailVerified).toBe(true);
    expect(stored.toJSON().googleId).toBeUndefined();
    stored.name = "Updated Google Student"; await stored.save();
    const emailLogin = response(); await login({ body: { email: identity.email, password: "anything" } }, emailLogin);
    expect(emailLogin.status).toHaveBeenCalledWith(400);
    expect(emailLogin.cookie).not.toHaveBeenCalled();
  });
  it("still requires a password for a normal account", async () => {
    await expect(User.create({ name: "No password", email: `${new mongoose.Types.ObjectId()}@example.test` })).rejects.toThrow(/password/);
  });
  it("atomically permits exactly one of two requests using the same nonce", async () => {
    const identity = googleIdentity(); const body = await attempt(identity);
    const responses = await Promise.all([signIn(body), signIn(body)]);
    expect(responses.filter((res) => payload(res)?.token)).toHaveLength(1);
    expect(responses.filter((res) => payload(res)?.code === "GOOGLE_EXPIRED")).toHaveLength(1);
    expect(await User.countDocuments({ googleId: identity.sub })).toBe(1);
    expect(payload(await signIn(body)).code).toBe("GOOGLE_EXPIRED");
  });
  it("links an existing instructor only after password proof and preserves course access", async () => {
    const identity = googleIdentity(); const courseId = new mongoose.Types.ObjectId();
    const existing = await User.create({ name: "Existing Teacher", email: identity.email, password: await bcrypt.hash("Existing-password-123", 10), role: "instructor", emailVerified: true, enrolledCourses: [courseId] });
    const body = await attempt(identity);
    expect(payload(await signIn(body)).code).toBe("GOOGLE_LINK_REQUIRED");
    expect((await User.findById(existing._id)).googleId).toBeUndefined();
    expect(payload(await signIn({ ...body, password: "wrong" })).code).toBe("GOOGLE_LINK_PASSWORD_INVALID");
    const linked = await signIn({ ...body, password: "Existing-password-123", role: "admin" });
    expect(payload(linked).user.role).toBe("instructor");
    const stored = await User.findById(existing._id);
    expect(stored.googleId).toBe(identity.sub);
    expect(stored.enrolledCourses.map(String)).toContain(String(courseId));
    expect(await User.countDocuments({ email: identity.email })).toBe(1);
    const returning = await signIn(await attempt(identity));
    expect(payload(returning).user._id.toString()).toBe(existing._id.toString());
  });
  it("requires independent verification for third-party Google email and can save that account", async () => {
    const identity = googleIdentity({ email: `${new mongoose.Types.ObjectId()}@example.test` });
    const res = await signIn(await attempt(identity));
    expect(payload(res)).toMatchObject({ requiresEmailVerification: true, emailSent: true });
    expect(res.cookie).not.toHaveBeenCalled();
    const stored = await User.findOne({ googleId: identity.sub });
    expect(stored.emailVerified).toBe(false);
    expect(stored.emailVerificationSentAt).toBeInstanceOf(Date);
    stored.emailVerified = true; await stored.save();
    expect(payload(await signIn(await attempt(identity))).token).toEqual(expect.any(String));
  });
  it("blocks suspended accounts even when the Google identity is valid", async () => {
    const identity = googleIdentity();
    await User.create({ name: "Suspended", email: identity.email, googleId: identity.sub, emailVerified: true, status: "suspended" });
    const res = await signIn(await attempt(identity));
    expect(payload(res).code).toBe("ACCOUNT_SUSPENDED");
    expect(res.cookie).not.toHaveBeenCalled();
  });
});
