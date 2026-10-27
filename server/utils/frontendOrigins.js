export const createFrontendOriginCheck = (env = process.env) => {
  const production = env.NODE_ENV === "production";
  const origins = new Set();
  for (const value of [env.FRONTEND_URL, ...(env.FRONTEND_URLS || "").split(",")]) {
    if (!value?.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (url.protocol === "https:" || (!production && url.protocol === "http:")) origins.add(url.origin);
    } catch { /* Invalid configuration never grants access. */ }
  }
  return (origin) => origins.has(origin) || (!production && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
};
