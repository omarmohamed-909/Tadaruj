export function interpolate(template, values = []) {
  return template.replace(/\{(\d+)\}/g, (placeholder, index) => index < values.length ? String(values[index]) : placeholder);
}

export function translateFeedback(dictionary, message, fallback, language) {
  const text = typeof message === "string" ? message : "";
  if (language !== "ar") return text || fallback;
  if (/[\u0600-\u06ff]/.test(text)) return text;
  return text && Object.hasOwn(dictionary, text) ? dictionary[text] : dictionary[fallback] ?? fallback;
}
