import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";
import { mailboxAddress } from "../utils/emailConfig.js";

dotenv.config({ quiet: true });
const toIndex = process.argv.indexOf("--to");
const recipient = toIndex >= 0 ? process.argv[toIndex + 1] : "";
if (!recipient || mailboxAddress(recipient) !== recipient.toLowerCase()) {
  console.error("Pass one mailbox you own: npm run email:test -- --to your-email@example.com");
  process.exitCode = 1;
} else {
  try {
    const result = await sendEmail({
      to: recipient,
      subject: "Tadaruj — Resend connection test",
      text: "This test confirms that Tadaruj can submit email through Resend. No account settings or permissions were changed.",
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px;color:#163638"><h2 style="color:#126252">Tadaruj</h2><p>This is your Resend connection test.</p><p>No account settings or permissions were changed.</p></div>',
    });
    console.log(JSON.stringify({ accepted: result.sent, messageId: result.messageId, provider: "resend", delivered: null, ...(result.reason ? { reason: result.reason } : {}) }, null, 2));
    if (!result.sent) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ accepted: false, code: error.code || "EMAIL_DELIVERY_FAILED", statusCode: error.statusCode }));
    process.exitCode = 1;
  }
}
