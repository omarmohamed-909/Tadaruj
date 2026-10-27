import { describe, expect, it } from "vitest";
import { getCourseGradeLevel, getCourseSubject, getGradeLabel } from "@/lib/courseTaxonomy";

describe("course taxonomy compatibility", () => {
  it("keeps new subject and stage independent", () => {
    const course = { subject: "History", gradeLevel: "Grade 4", category: "Mathematics" };
    expect(getCourseSubject(course)).toBe("History");
    expect(getCourseGradeLevel(course)).toBe("Grade 4");
  });

  it("recognizes old subject categories", () => {
    expect(getCourseSubject({ category: "Biology" })).toBe("Biology");
    expect(getCourseGradeLevel({ category: "Biology" })).toBe("");
  });

  it("recognizes old grade categories without inventing a subject", () => {
    expect(getCourseSubject({ category: "Grade 3" })).toBe("");
    expect(getCourseGradeLevel({ category: "Grade 3" })).toBe("Grade 3");
  });

  it("localizes stage labels without changing their stored values", () => {
    expect(getGradeLabel("Grade 3", "ar")).toBe("الصف 3");
    expect(getGradeLabel("Secondary 2", "ar")).toBe("ثانوي 2");
    expect(getGradeLabel("University", "ar")).toBe("الجامعة");
    expect(getGradeLabel("Grade 3", "en")).toBe("Grade 3");
  });
});
