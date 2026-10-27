export const secureMediaUrl = (url) => {
  if (typeof url !== "string") {
    return url;
  }

  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith("blob:") || normalizedUrl.startsWith("data:")) {
    return normalizedUrl;
  }

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    normalizedUrl.startsWith("http://")
  ) {
    return `https://${normalizedUrl.slice(7)}`;
  }

  return normalizedUrl;
};