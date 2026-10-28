export const mailboxAddress = (value) => {
  if (typeof value !== "string" || /[\r\n]/.test(value)) return "";
  const parts = value.trim().match(/^(?:[^<>]+<([^<>]+)>|([^<>]+))$/);
  const address = (parts?.[1] || parts?.[2] || "").trim();
  return /^[^\s<>@,]+@[^\s<>@,]+\.[^\s<>@,]+$/.test(address) ? address.toLowerCase() : "";
};

export const getEmailConfig = (env = process.env) => {
  const apiKey = env.RESEND_API_KEY?.trim() || "";
  const from = env.RESEND_FROM_EMAIL?.trim() || "";
  const replyTo = env.RESEND_REPLY_TO?.trim() || "";
  const testRecipient = env.RESEND_TEST_RECIPIENT?.trim().toLowerCase() || "";
  const enabled = env.EMAIL_DELIVERY_ENABLED !== "false";
  const address = mailboxAddress(from);
  const testing = address.endsWith("@resend.dev");
  const demo = env.DEPLOYMENT_STAGE === "demo";
  const credentialsConfigured = /^re_[A-Za-z0-9_-]+$/.test(apiKey) && Boolean(address) && (!replyTo || Boolean(mailboxAddress(replyTo)));
  const testRecipientValid = !testing || Boolean(testRecipient && mailboxAddress(testRecipient) === testRecipient);
  const productionSenderConfigured = credentialsConfigured && enabled && !testing;
  const configured = credentialsConfigured && enabled && testRecipientValid && (env.NODE_ENV !== "production" || !testing || demo);
  return { apiKey, from, replyTo, testRecipient, enabled, testing, credentialsConfigured, testRecipientValid, configured, productionSenderConfigured };
};
