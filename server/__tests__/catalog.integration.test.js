import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Lecture } from "../models/lecture.model.js";
import { getCourseFilters, getPublishedCourse, searchCourse } from "../controllers/course.controller.js";
import { getPublicInstructor } from "../controllers/instructor.controller.js";

const uri = process.env.TEST_CATALOG_MONGO_URI;
const response = () => ({ status() { return this; }, json(body) { this.body = body; return this; } });
const call = async (handler, query = {}, params = {}) => { const res = response(); await handler({ query, params }, res); return res.body; };

describe.skipIf(!uri)("public catalog with isolated real MongoDB", () => {
  let teacher;
  beforeAll(async () => {
    if (!/^mongodb:\/\/127\.0\.0\.1:27028\/tadaruj_test_[a-f0-9]+\?replicaSet=codex-test$/.test(uri)) throw new Error("Use a new isolated catalog test database.");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    if ((await mongoose.connection.db.listCollections().toArray()).length) throw new Error("The catalog test database must be empty.");
    teacher = await User.create({ name: "Catalog Teacher", email: "private-catalog@example.test", password: "test-only", role: "instructor" });
    const other = await User.create({ name: "Other Teacher", email: "private-other@example.test", password: "test-only", role: "instructor" });
    const lecture = await Lecture.create({ lectureTitle: "Private lesson", videoUrl: "https://example.test/private-video", quizQuestions: [{ questionText: "Private answer", options: ["A", "B"], correctOptionIndex: 1 }] });
    const createdAt = new Date("2026-01-01T00:00:00Z");
    await Course.insertMany(Array.from({ length: 26 }, (_, index) => ({
      courseTitle: index === 0 ? ".* Physics" : `Science ${index}`,
      subject: "Science", gradeLevel: "Grade 1", coursePrice: index % 3,
      creator: teacher._id, isPublished: true, lectures: [lecture._id], enrolledStudents: [other._id],
      description: "Private full description", createdAt,
    })));
    await Course.create([
      { courseTitle: "Draft course", subject: "Unreleased", creator: teacher._id, isPublished: false },
      { courseTitle: "Legacy History", category: "History", creator: other._id, isPublished: true, createdAt },
      { courseTitle: "Legacy Prep", category: "Prep 1", creator: other._id, isPublished: true, createdAt },
    ]);
  }, 20000);
  afterAll(async () => { await mongoose.disconnect(); });

  it("paginates a stable public catalog without leaking learner or lecture data", async () => {
    const first = await call(getPublishedCourse, { page: "1", limit: "12" });
    const second = await call(getPublishedCourse, { page: "2", limit: "12" });
    expect(first).toMatchObject({ page: 1, total: 28, totalPages: 3, limit: 12 });
    expect(first.courses).toHaveLength(12);
    expect(second.courses).toHaveLength(12);
    expect(new Set([...first.courses, ...second.courses].map((course) => String(course._id))).size).toBe(24);
    for (const course of [...first.courses, ...second.courses]) {
      expect(course.lectures).toBeUndefined();
      expect(course.enrolledStudents).toBeUndefined();
      expect(course.description).toBeUndefined();
      expect(course.creator.email).toBeUndefined();
    }
  });
  it("recovers obsolete page links and caps oversized page requests", async () => {
    const last = await call(getPublishedCourse, { page: "999", limit: "12" });
    expect(last).toMatchObject({ page: 3, totalPages: 3 });
    expect(last.courses).toHaveLength(4);
    expect((await call(getPublishedCourse, { limit: "999" })).courses).toHaveLength(24);
  });
  it("keeps search filters and price ordering across pages and treats regex text literally", async () => {
    const first = await call(searchCourse, { subjects: "Science", grades: "Grade 1", sortByPrice: "low", page: "1" });
    const second = await call(searchCourse, { subjects: "Science", grades: "Grade 1", sortByPrice: "low", page: "2" });
    expect(first.total).toBe(26);
    const courses = [...first.courses, ...second.courses];
    expect(new Set(courses.map((course) => String(course._id))).size).toBe(24);
    expect(courses.map((course) => course.coursePrice)).toEqual(courses.map((course) => course.coursePrice).sort((a, b) => a - b));
    const literal = await call(searchCourse, { query: ".*" });
    expect(literal.total).toBe(1);
    expect(literal.courses[0].courseTitle).toBe(".* Physics");
  });
  it("counts all instructor courses while returning one page and excludes drafts and other instructors", async () => {
    const body = await call(getPublicInstructor, { page: "2", limit: "12" }, { instructorId: String(teacher._id) });
    expect(body).toMatchObject({ page: 2, total: 26, totalPages: 3, instructor: { courseCount: 26 } });
    expect(body.courses).toHaveLength(12);
    expect(body.courses.every((course) => String(course.creator._id) === String(teacher._id))).toBe(true);
    expect(body.instructor.email).toBeUndefined();
  });
  it("returns facets for the entire published catalog, including legacy records", async () => {
    const body = await call(getCourseFilters);
    expect(body).toEqual({ subjects: ["History", "Science"], grades: ["Grade 1", "Prep 1"] });
    expect(body.courses).toBeUndefined();
  });
});
