import { getEmailConfig } from "./emailConfig.js";

// Return names and readiness only. Never include credential values in diagnostics.
export function inspectSetup(env = process.env) {
  const issues = [];
  const present = (name) => typeof env[name] === "string" && env[name].trim() !== "";
  const database = present("MONGO_URI") && /^mongodb(?:\+srv)?:\/\//.test(env.MONGO_URI);
  const secret = present("SECRET_KEY") && env.SECRET_KEY.length >= 32 && !/replace_with|your_secret/i.test(env.SECRET_KEY);
  const cloudinary = present("CLOUDINARY_URL") || ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every(present) || ["CLOUD_NAME", "API_KEY", "API_SECRET"].every(present);
  const emailConfig = getEmailConfig(env);
  const google = present("GOOGLE_CLIENT_ID") && /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID.trim());
  let frontend = false;
  try {
    const url = new URL(env.FRONTEND_URL);
    frontend = (env.NODE_ENV === "production" ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol))
      && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  } catch { /* Report the field name below. */ }
  if (!database) issues.push("MONGO_URI is missing or invalid.");
  if (!secret) issues.push("SECRET_KEY must be a non-placeholder secret of at least 32 characters.");
  if (!frontend) issues.push("FRONTEND_URL is missing or invalid (HTTPS required in production).");
  for (const value of (env.FRONTEND_URLS || "").split(",").filter((item) => item.trim())) {
    try {
      const url = new URL(value.trim());
      if (!(env.NODE_ENV === "production" ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    } catch { issues.push("FRONTEND_URLS must contain exact allowed origins (HTTPS required in production)."); break; }
  }
  const proxyHops = Number(env.TRUST_PROXY_HOPS || "0");
  if (!Number.isSafeInteger(proxyHops) || proxyHops < 0) issues.push("TRUST_PROXY_HOPS must be a non-negative integer matching your reverse proxy.");
  if (!cloudinary) issues.push("Cloudinary upload credentials are missing.");
  if (!emailConfig.credentialsConfigured) issues.push("Set RESEND_API_KEY and a valid RESEND_FROM_EMAIL (and valid optional RESEND_REPLY_TO).");
  if (!emailConfig.enabled) issues.push("Email delivery is disabled by EMAIL_DELIVERY_ENABLED=false.");
  if (!emailConfig.testRecipientValid) issues.push("RESEND_TEST_RECIPIENT must be the Resend account owner's email for the resend.dev test sender.");
  if (env.NODE_ENV === "production" && emailConfig.testing && env.DEPLOYMENT_STAGE !== "demo") issues.push("Production email requires a verified sending domain; resend.dev is for testing only.");
  if (present("DEPLOYMENT_STAGE") && !["demo", "production"].includes(env.DEPLOYMENT_STAGE)) issues.push("DEPLOYMENT_STAGE must be demo or production.");
  if (present("GOOGLE_CLIENT_ID") && !google) issues.push("GOOGLE_CLIENT_ID must be a valid Google web application client ID, or left empty to disable Google sign-in.");
  if (env.NODE_ENV === "production" && ["ALLOW_DEV_RESET_LINKS", "ALLOW_DEV_VERIFICATION_LINKS"].some((key) => env[key] === "true")) {
    issues.push("Local development email shortcuts must be disabled in production.");
  }
  return { ready: issues.length === 0 && emailConfig.configured, configured: { database, secret, frontend, cloudinary, email: emailConfig.configured, google }, email: { provider: "resend", mode: emailConfig.testing ? "testing" : "domain", productionSenderConfigured: emailConfig.productionSenderConfigured, domainVerified: null }, issues };
}
