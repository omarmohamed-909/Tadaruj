import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Resend } from "resend";
import { getEmailConfig, mailboxAddress } from "./emailConfig.js";

// Do not propagate provider payloads: they may contain recipients or authentication links.
const deliveryError = (statusCode) => Object.assign(new Error("Resend did not accept the email."), {
  code: "EMAIL_DELIVERY_FAILED", ...(Number.isInteger(statusCode) ? { statusCode } : {}),
});

export const sendEmail = async ({ to, subject, html, text, idempotencyKey }) => {
  const config = getEmailConfig();
  if (!config.configured) return { sent: false, skipped: true };
  // The shared resend.dev sender can only deliver to the account owner's mailbox.
  if (config.testing && (typeof to !== "string" || mailboxAddress(to) !== config.testRecipient)) {
    return { sent: false, skipped: true, reason: "test_recipient_only" };
  }
  const resend = new Resend(config.apiKey);
  const requestKey = idempotencyKey || randomUUID();
  const payload = { from: config.from, to, subject, ...(html ? { html } : {}), ...(text ? { text } : {}), ...(config.replyTo ? { replyTo: config.replyTo } : {}) };
  for (let attempt = 0; attempt < 2; attempt++) {
    let result;
    try {
      result = await resend.emails.send(payload, { idempotencyKey: requestKey, signal: AbortSignal.timeout(10000) });
    } catch {
      if (attempt === 0) { await delay(250); continue; }
      throw deliveryError();
    }
    if (!result?.error && typeof result?.data?.id === "string" && result.data.id) {
      // Accepted by Resend; delivery/bounce confirmation belongs to provider events.
      return { sent: true, skipped: false, messageId: result.data.id, provider: "resend" };
    }
    const status = result?.error?.statusCode;
    const retryAfter = Number(result?.headers?.["retry-after"] || 0);
    const transient = result?.error && (status === 429 || status >= 500 || status == null);
    if (attempt === 0 && transient && retryAfter <= 2) {
      await delay(Math.max(250, retryAfter * 1000));
      continue;
    }
    throw deliveryError(status);
  }
};
