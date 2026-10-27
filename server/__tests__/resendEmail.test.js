import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { send, construct } = vi.hoisted(() => ({ send: vi.fn(), construct: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { constructor(key) { construct(key); this.emails = { send }; } } }));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue() }));
import { sendEmail } from "../utils/sendEmail.js";
import { getEmailConfig, mailboxAddress } from "../utils/emailConfig.js";
import { setTimeout as delay } from "node:timers/promises";

const message = { to: "user@example.test", subject: "Verify your account", html: "<p>Private verification link</p>", text: "Private verification link" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test_secret");
  vi.stubEnv("RESEND_FROM_EMAIL", "Tadaruj <accounts@academy.example.test>");
  vi.stubEnv("RESEND_REPLY_TO", "");
  vi.stubEnv("RESEND_TEST_RECIPIENT", "");
  vi.stubEnv("EMAIL_DELIVERY_ENABLED", "true");
  vi.stubEnv("NODE_ENV", "test");
  send.mockResolvedValue({ data: { id: "email-id" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("Resend transactional mail", () => {
  it("submits the sender and both message formats through the official SDK", async () => {
    expect(await sendEmail(message)).toEqual({ sent: true, skipped: false, provider: "resend", messageId: "email-id" });
    expect(construct).toHaveBeenCalledWith("re_test_secret");
    expect(send).toHaveBeenCalledWith({ ...message, from: "Tadaruj <accounts@academy.example.test>" }, expect.objectContaining({ idempotencyKey: expect.any(String), signal: expect.any(AbortSignal) }));
  });
  it("applies the configured reply-to mailbox", async () => {
    vi.stubEnv("RESEND_REPLY_TO", "support@academy.example.test"); await sendEmail(message);
    expect(send.mock.calls[0][0].replyTo).toBe("support@academy.example.test");
  });
  it.each(["RESEND_API_KEY", "RESEND_FROM_EMAIL"])("reports skipped delivery when %s is missing", async (key) => {
    vi.stubEnv(key, ""); expect(await sendEmail(message)).toEqual({ sent: false, skipped: true });
    expect(construct).not.toHaveBeenCalled();
  });
  it("keeps isolated browser QA from sending real mail by default", async () => {
    vi.stubEnv("EMAIL_DELIVERY_ENABLED", "false"); expect((await sendEmail(message)).sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it("accepts only the configured account owner in resend.dev testing mode", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "Tadaruj <onboarding@resend.dev>");
    vi.stubEnv("RESEND_TEST_RECIPIENT", message.to);
    expect((await sendEmail(message)).sent).toBe(true);
    send.mockClear();
    expect(await sendEmail({ ...message, to: "other@example.test" })).toEqual({ sent: false, skipped: true, reason: "test_recipient_only" });
    expect(send).not.toHaveBeenCalled();
  });
  it("does not send to a list or hidden extra recipient in testing mode", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev"); vi.stubEnv("RESEND_TEST_RECIPIENT", message.to);
    for (const to of [[message.to, "other@example.test"], `${message.to}, other@example.test`]) {
      expect((await sendEmail({ ...message, to })).sent).toBe(false);
    }
    expect(send).not.toHaveBeenCalled();
  });
  it("does not enable production delivery with the unverified trial sender", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev"); vi.stubEnv("RESEND_TEST_RECIPIENT", message.to);
    expect((await sendEmail(message)).sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 409, 422])("does not retry or claim success after a permanent %s error", async (statusCode) => {
    send.mockResolvedValue({ data: null, error: { statusCode, message: "private-provider-payload" } });
    await expect(sendEmail(message)).rejects.toMatchObject({ code: "EMAIL_DELIVERY_FAILED", statusCode });
    expect(send).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });
  it.each([429, 500, 503])("retries a transient %s once with the same idempotency key", async (statusCode) => {
    send.mockResolvedValueOnce({ error: { statusCode }, headers: { "retry-after": "1" } }).mockResolvedValueOnce({ data: { id: "accepted" }, error: null });
    expect((await sendEmail(message)).sent).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][1].idempotencyKey).toBe(send.mock.calls[1][1].idempotencyKey);
    expect(delay).toHaveBeenCalledWith(1000);
  });
  it("does not retry earlier than a longer provider Retry-After", async () => {
    send.mockResolvedValue({ error: { statusCode: 429 }, headers: { "retry-after": "30" } });
    await expect(sendEmail(message)).rejects.toMatchObject({ statusCode: 429 });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("bounds retries and sanitizes provider errors containing private content", async () => {
    send.mockRejectedValue(new Error("re_private-key and a private authentication link"));
    const error = await sendEmail(message).catch((value) => value);
    expect(error.message).not.toContain("re_private-key");
    expect(error.message).not.toContain("authentication link");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][1].idempotencyKey).toBe(send.mock.calls[1][1].idempotencyKey);
  });
  it("does not claim acceptance when the provider returns no message ID", async () => {
    send.mockResolvedValue({ data: {}, error: null });
    await expect(sendEmail(message)).rejects.toMatchObject({ code: "EMAIL_DELIVERY_FAILED" });
  });
  it("preserves an explicit idempotency key", async () => {
    await sendEmail({ ...message, idempotencyKey: "specific-email-attempt" });
    expect(send.mock.calls[0][1].idempotencyKey).toBe("specific-email-attempt");
  });
});

describe("sender configuration", () => {
  it.each(["sender@example.test", "Tadaruj <sender@example.test>"])("parses a valid sender", (value) => expect(mailboxAddress(value)).toBe("sender@example.test"));
  it.each(["bad", "Tadaruj <sender@example.test", "sender@example.test>", "a@example.test, b@example.test", "sender@example.test\r\nBcc: other@example.test"])("rejects malformed or injected senders", (value) => expect(mailboxAddress(value)).toBe(""));
  it("requires an exact account mailbox for trial sends", () => {
    expect(getEmailConfig({ RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "onboarding@resend.dev", RESEND_TEST_RECIPIENT: "Name <user@example.test>" }).configured).toBe(false);
  });
});
