// Separate deployments set this explicitly; same-origin deployments use /api/v1.
const configured = import.meta.env.VITE_API_BASE_URL?.trim();
const local = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
export const API_BASE_URL = configured ? configured.replace(/\/+$/, "") : local ? "http://localhost:8080" : "";
