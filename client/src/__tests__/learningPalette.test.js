import { describe, expect, it } from "vitest";

const screens = import.meta.glob([
  "../pages/student/AllCourses.jsx",
  "../pages/student/Courses.jsx",
  "../pages/student/Course.jsx",
  "../pages/student/Filter.jsx",
  "../pages/student/SearchPage.jsx",
  "../pages/student/SearchResult.jsx",
  "../pages/student/CourseDetail.jsx",
  "../pages/student/CourseProgress.jsx",
  "../pages/student/MyLearning.jsx",
  "../components/BuyCourseButton.jsx",
  "../components/BrandedLoader.jsx",
], { query: "?raw", import: "default", eager: true });

describe("learning journey palette regression", () => {
  it.each(Object.keys(screens))("uses the shared palette throughout the journey: %s", (path) => {
    expect(screens[path]).not.toMatch(/(?:bg|border|text|ring|from|to)-(?:slate|gray|blue|cyan|indigo|violet)-\d+/);
    expect(screens[path]).not.toMatch(/#(?:020617|0f172a|081226|1d4ed8|0f3a69)/i);
  });
});
