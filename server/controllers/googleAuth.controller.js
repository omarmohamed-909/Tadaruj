import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { GoogleLoginAttempt } from "../models/googleLoginAttempt.model.js";
import { generateToken } from "../utils/generateToken.js";
import { getGoogleClientId, isGoogleEmailAuthoritative, verifyGoogleCredential } from "../utils/googleIdentity.js";
import { buildVerificationResponse, sendVerificationEmail } from "./user.controller.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (res, status, code) => res.status(status).json({ success: false, code });

const allowedOrigin = (req) => {
  const origin = req.headers?.origin;
  if (typeof origin !== "string") return "";
  try {
    if (new URL(origin).origin !== origin) return "";
    const configured = [process.env.FRONTEND_URL, ...(process.env.FRONTEND_URLS || "").split(",")]
      .filter(Boolean).map((url) => new URL(url.trim()).origin);
    if (configured.includes(origin)) return origin;
    if (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
  } catch { /* Invalid origins fail closed. */ }
  return "";
};

export const googleConfig = (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({ enabled: Boolean(getGoogleClientId()) });
};

export const googleChallenge = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const clientId = getGoogleClientId();
  if (!clientId) return fail(res, 503, "GOOGLE_UNAVAILABLE");
  const origin = allowedOrigin(req);
  if (!origin || !req.is("application/json")) return fail(res, 403, "GOOGLE_ORIGIN_REJECTED");
  try {
    const nonce = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await GoogleLoginAttempt.create({ _id: hash(nonce), origin, clientId, expiresAt });
    return res.json({ clientId, nonce, expiresAt: expiresAt.toISOString() });
  } catch {
    return fail(res, 503, "GOOGLE_UNAVAILABLE");
  }
};

export const googleLogin = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const clientId = getGoogleClientId();
  if (!clientId) return fail(res, 503, "GOOGLE_UNAVAILABLE");
  const origin = allowedOrigin(req);
  if (!origin || !req.is("application/json")) return fail(res, 403, "GOOGLE_ORIGIN_REJECTED");
  const { credential, nonce, password } = req.body || {};
  if (typeof credential !== "string" || credential.length > 12000 || !credential ||
      typeof nonce !== "string" || !/^[a-f0-9]{64}$/.test(nonce)) return fail(res, 400, "GOOGLE_INVALID_CREDENTIAL");
  try {
    const attemptQuery = { _id: hash(nonce), origin, clientId, expiresAt: { $gt: new Date() } };
    if (!await GoogleLoginAttempt.exists(attemptQuery)) return fail(res, 401, "GOOGLE_EXPIRED");
    let identity;
    try { identity = await verifyGoogleCredential(credential, clientId); }
    catch { return fail(res, 401, "GOOGLE_INVALID_CREDENTIAL"); }
    if (!identity || identity.nonce !== nonce || typeof identity.sub !== "string" || !identity.sub || identity.sub.length > 255 ||
        typeof identity.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email) || identity.email_verified !== true) {
      return fail(res, 401, "GOOGLE_INVALID_CREDENTIAL");
    }
    const email = identity.email.trim().toLowerCase();
    let user = await User.findOne({ googleId: identity.sub });
    if (!user) user = await User.findOne({ email });
    if (user?.status === "suspended") return fail(res, 403, "ACCOUNT_SUSPENDED");
    if (user?.googleId && user.googleId !== identity.sub) return fail(res, 409, "GOOGLE_ACCOUNT_CONFLICT");
    if (user && user.emailVerified !== true) {
      return res.status(403).json({ success: false, code: "GOOGLE_VERIFY_EMAIL", email: user.email });
    }
    const needsLink = user && !user.googleId;
    if (needsLink) {
      // Matching email alone must never link a password account, including admin accounts.
      if (typeof password !== "string" || !password) return fail(res, 409, "GOOGLE_LINK_REQUIRED");
      if (password.length > 1024 || !user.password || !await bcrypt.compare(password, user.password)) return fail(res, 401, "GOOGLE_LINK_PASSWORD_INVALID");
    }
    // Atomic consumption prevents replay, including two concurrent requests.
    if (!await GoogleLoginAttempt.findOneAndDelete({ ...attemptQuery, expiresAt: { $gt: new Date() } })) return fail(res, 401, "GOOGLE_EXPIRED");
    if (needsLink) {
      user = await User.findOneAndUpdate({ _id: user._id, googleId: { $exists: false }, password: user.password, status: { $ne: "suspended" }, emailVerified: true },
        { $set: { googleId: identity.sub } }, { new: true, runValidators: true });
      if (!user) return fail(res, 409, "GOOGLE_ACCOUNT_CONFLICT");
    } else if (!user) {
      user = await User.create({
        name: (typeof identity.name === "string" ? identity.name.trim().slice(0, 100) : "") || email.split("@")[0],
        email, googleId: identity.sub, role: "student", status: "active",
        emailVerified: isGoogleEmailAuthoritative(identity),
      });
      if (!user.emailVerified) {
        const details = await sendVerificationEmail(user);
        return res.status(201).json({ success: true, requiresEmailVerification: true, email, ...buildVerificationResponse(details) });
      }
    }
    return generateToken(res, user, "Signed in with Google.");
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "GOOGLE_ACCOUNT_CONFLICT");
    // Never log the ID token, nonce, password, or Google profile.
    return fail(res, 503, "GOOGLE_UNAVAILABLE");
  }
};
