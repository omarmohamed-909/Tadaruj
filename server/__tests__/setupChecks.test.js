import { describe, expect, it } from "vitest";
import { inspectSetup } from "../utils/setupChecks.js";

const valid = {
  NODE_ENV: "production", MONGO_URI: "mongodb://127.0.0.1:27017/test", SECRET_KEY: "test-secret-at-least-thirty-two-characters",
  FRONTEND_URL: "https://academy.example.test", CLOUD_NAME: "test", API_KEY: "test", API_SECRET: "private-cloud-secret",
  RESEND_API_KEY: "re_private_mail_secret", RESEND_FROM_EMAIL: "Tadaruj <accounts@academy.example.test>",
};
describe("setup diagnostics", () => {
  it("reports Google readiness without requiring it for password authentication", () => {
    expect(inspectSetup(valid).configured.google).toBe(false);
    const clientId = "123-test.apps.googleusercontent.com";
    const configured = inspectSetup({ ...valid, GOOGLE_CLIENT_ID: clientId });
    expect(configured.configured.google).toBe(true);
    expect(JSON.stringify(configured)).not.toContain(clientId);
    expect(inspectSetup({ ...valid, GOOGLE_CLIENT_ID: "placeholder" }).ready).toBe(false);
  });
  it("recognizes the legacy Cloudinary config without leaking secrets", () => {
    const report = inspectSetup(valid);
    expect(report.ready).toBe(true);
    expect(JSON.stringify(report)).not.toContain(valid.RESEND_API_KEY);
    expect(JSON.stringify(report)).not.toContain(valid.API_SECRET);
    expect(JSON.stringify(report)).not.toContain(valid.SECRET_KEY);
  });
  it("reports missing email instead of treating it as configured", () => {
    const report = inspectSetup({ ...valid, RESEND_API_KEY: "" });
    expect(report.ready).toBe(false);
    expect(report.configured.email).toBe(false);
  });
  it("requires production HTTPS and disables local shortcuts", () => {
    const report = inspectSetup({ ...valid, FRONTEND_URL: "http://example.test", ALLOW_DEV_VERIFICATION_LINKS: "true" });
    expect(report.configured.frontend).toBe(false);
    expect(report.issues.some((issue) => issue.includes("shortcuts"))).toBe(true);
  });
  it("distinguishes trial sending from production-ready domain configuration", () => {
    const testing = { ...valid, NODE_ENV: "test", RESEND_FROM_EMAIL: "onboarding@resend.dev", RESEND_TEST_RECIPIENT: "owner@example.test" };
    expect(inspectSetup(testing)).toMatchObject({ ready: true, email: { mode: "testing", productionSenderConfigured: false } });
    expect(inspectSetup({ ...testing, NODE_ENV: "production" }).configured.email).toBe(false);
    expect(inspectSetup({ ...testing, RESEND_TEST_RECIPIENT: "" }).ready).toBe(false);
  });
  it("reports disabled delivery and invalid sender configuration", () => {
    expect(inspectSetup({ ...valid, EMAIL_DELIVERY_ENABLED: "false" }).configured.email).toBe(false);
    expect(inspectSetup({ ...valid, RESEND_FROM_EMAIL: "invalid" }).ready).toBe(false);
  });
  it("allows localhost URLs during development", () => {
    expect(inspectSetup({ ...valid, NODE_ENV: "development", FRONTEND_URL: "http://localhost:5173" }).ready).toBe(true);
  });
  it("requires exact origins without embedded credentials, paths, or query data", () => {
    for (const origin of ["https://user:password@example.test", "https://example.test/login", "https://example.test/?token=private"]) {
      expect(inspectSetup({ ...valid, FRONTEND_URL: origin }).ready).toBe(false);
      expect(inspectSetup({ ...valid, FRONTEND_URLS: origin }).ready).toBe(false);
    }
    expect(inspectSetup({ ...valid, FRONTEND_URLS: "https://www.example.test,http://localhost:5173" }).ready).toBe(false);
  });
  it("rejects ambiguous proxy hop settings", () => {
    for (const value of ["-1", "1oops", "1.5"]) expect(inspectSetup({ ...valid, TRUST_PROXY_HOPS: value }).ready).toBe(false);
  });
});
