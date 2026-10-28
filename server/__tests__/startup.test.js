import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);
const cwd = fileURLToPath(new URL("../", import.meta.url));
// Synthetic values only. No connection or provider request is made on import.
const configured = {
  ...process.env, NODE_ENV: "production", VERCEL: "1", MONGO_URI: "mongodb://unit.invalid/test",
  SECRET_KEY: "synthetic-startup-signing-key-only-for-tests", FRONTEND_URL: "https://tadaruj.example.test", FRONTEND_URLS: "",
  TRUST_PROXY_HOPS: "0", ALLOW_DEV_RESET_LINKS: "false", ALLOW_DEV_VERIFICATION_LINKS: "false", GOOGLE_CLIENT_ID: "",
  CLOUDINARY_URL: "", CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "synthetic", CLOUDINARY_API_SECRET: "synthetic",
  RESEND_API_KEY: "re_synthetic_only", RESEND_FROM_EMAIL: "Tadaruj <accounts@tadaruj.example.test>", RESEND_REPLY_TO: "", RESEND_TEST_RECIPIENT: "", EMAIL_DELIVERY_ENABLED: "true",
};
const run = (env) => execute(process.execPath, ["--input-type=module", "-e", 'const {default: app} = await import("./index.js"); if (typeof app !== "function") throw new Error("Missing application export");'], { cwd, env, timeout: 20000 });

describe("deployment entry point", () => {
  it("exports the configured serverless app without starting a listener or database connection", async () => {
    await expect(run(configured)).resolves.toBeDefined();
  }, 25000);
  it("refuses incomplete production configuration before accepting traffic", async () => {
    try {
      await run({ ...configured, SECRET_KEY: "", MONGO_URI: "private-invalid-connection" });
      throw new Error("The deployment must refuse missing configuration");
    } catch (error) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Production configuration is incomplete");
      expect(error.stderr).not.toContain("private-invalid-connection");
    }
  }, 25000);
  it("rejects an invalid standalone port before opening database connections", async () => {
    await expect(run({ ...configured, NODE_ENV: "test", VERCEL: "", PORT: "invalid" })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("PORT must be an integer") });
  }, 25000);
});
