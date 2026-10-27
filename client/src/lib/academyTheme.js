const themedRoutes = [
  "/instructor",
  "/courses",
  "/course/search",
  "/course-detail",
  "/course-progress",
  "/my-learning",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-notice",
];

export const usesAcademyTheme = (pathname) =>
  themedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
