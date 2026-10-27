export const COURSE_PAGE_SIZE = 12;

export function parseCoursePage(value) {
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Math.min(Number(value), 100000);
}

export function withCoursePage(searchParams, page) {
  const next = new URLSearchParams(searchParams);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return next;
}
