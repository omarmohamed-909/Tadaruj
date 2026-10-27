import { afterEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("google-auth-library", () => ({ OAuth2Client: class { verifyIdToken = verify; } }));
import { getGoogleClientId, isGoogleEmailAuthoritative, verifyGoogleCredential } from "../utils/googleIdentity.js";
afterEach(() => vi.unstubAllEnvs());
describe("official Google token verifier", () => {
  it("checks the configured audience with the Google SDK rather than decoding an unsigned JWT", async () => {
    const identity = { sub: "subject" }; verify.mockResolvedValue({ getPayload: () => identity });
    expect(await verifyGoogleCredential("signed-token", "client-id")).toEqual(identity);
    expect(verify).toHaveBeenCalledWith({ idToken: "signed-token", audience: "client-id" });
  });
  it("does not accept placeholder client IDs", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "your-client-id"); expect(getGoogleClientId()).toBe("");
  });
  it.each([
    [{ email: "user@gmail.com", email_verified: true }, true],
    [{ email: "user@school.example", email_verified: true, hd: "school.example" }, true],
    [{ email: "user@example.test", email_verified: true }, false],
    [{ email: "user@gmail.com", email_verified: false }, false],
  ])("distinguishes Google-hosted mailboxes from third-party addresses", (claims, expected) => {
    expect(isGoogleEmailAuthoritative(claims)).toBe(expected);
  });
});
