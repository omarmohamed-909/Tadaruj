import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();
export const getGoogleClientId = () => {
  const value = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  return /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(value) ? value : "";
};

export const verifyGoogleCredential = async (credential, clientId) => {
  // The official library checks Google's signature, issuer, audience and expiry.
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  return ticket.getPayload();
};

export const isGoogleEmailAuthoritative = (payload) =>
  payload.email_verified === true &&
  (payload.email.toLowerCase().endsWith("@gmail.com") || Boolean(payload.hd));
