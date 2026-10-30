import { getStudentTracking, getQuestionInbox, resolveQuestion, updateQuizSettings } from "../controllers/teaching.controller.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { QuizResult } from "../models/quizResult.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { updateCurriculum } from "../controllers/curriculum.controller.js";
import { removeLecture, createLecture, reorderLecture } from "../controllers/course.controller.js";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Notification } from "../models/notification.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { register, login, verifyEmail } from "../controllers/user.controller.js";
import { requestManualOrder, reviewManualOrder } from "../controllers/manualOrder.controller.js";
import { getCourseProgress, updateCourseProgress, markAsCompleted, submitQuizResult, saveLearningPosition, getMyLearning, getCourseQuizResults } from "../controllers/courseProgress.controller.js";
import { LearningPosition } from "../models/learningPosition.model.js";
import { editCourse, togglePublishCourse } from "../controllers/course.controller.js";
import { Lecture } from "../models/lecture.model.js";

// Email delivery alone is simulated; models, hashing, JWTs and transactions are real.
vi.mock("../utils/sendEmail.js", () => ({ sendEmail: vi.fn().mockResolvedValue({ sent: true }) }));

const uri = process.env.TEST_MONGO_URI;
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), cookie: vi.fn().mockReturnThis() });
const payload = (res) => res.json.mock.calls.at(-1)?.[0];

describe.skipIf(!uri)("isolated MongoDB student/payment journey", () => {
  let teacher, student, course;
  beforeAll(async () => {
    // Fail closed: never read the application's MONGO_URI or clear an existing database.
    if (!/^mongodb:\/\/127\.0\.0\.1:27028\/tadaruj_test_[a-f0-9]+\?replicaSet=codex-test$/.test(uri)) {
      throw new Error("Use a uniquely named database on the isolated local test replica set.");
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    if ((await mongoose.connection.db.listCollections().toArray()).length) {
      throw new Error("Test database must be empty.");
    }
    await Promise.all([User.init(), Course.init(), CoursePurchase.init(), Notification.init(), AuditLog.init(), LearningPosition.init()]);
  }, 20000);
  beforeEach(async () => {
    teacher = await User.create({ name: "Test Teacher", email: `teacher-${new mongoose.Types.ObjectId()}@example.test`, password: "test-only", role: "instructor", emailVerified: true, instructorWhatsapp: "+201001234567" });
    student = await User.create({ name: "Test Student", email: `student-${new mongoose.Types.ObjectId()}@example.test`, password: "test-only", emailVerified: true });
    course = await Course.create({ courseTitle: "Test Physics", subject: "Physics", creator: teacher._id, isPublished: true, coursePrice: 250 });
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    // Keep the disposable database for inspection; no destructive cleanup.
    await mongoose.disconnect();
  });
  const request = async () => {
    const res = response();
    await requestManualOrder({ id: String(student._id), user: student, body: { courseId: String(course._id) } }, res);
    expect(payload(res).order.status).toBe("pending");
    return payload(res).order;
  };
  const review = async (order, decision = "approve", actor = teacher) => {
    const res = response();
    await reviewManualOrder({ id: String(actor._id), user: actor, params: { orderId: String(order._id) }, body: { decision }, ip: "127.0.0.1" }, res);
    return res;
  };
  const access = async () => {
    const res = response();
    await getCourseProgress({ id: String(student._id), user: student, params: { courseId: String(course._id) } }, res);
    return res;
  };

  it("enforces configured quiz limits and preserves each attempt's pass policy", async () => {
    const lecture = await Lecture.create({ lectureTitle: "Quiz", quizQuestions: [{ questionText: "2 + 2?", options: ["4", "5"], correctOptionIndex: 0 }] });
    course.lectures = [lecture._id]; await course.save(); student.enrolledCourses = [course._id]; await student.save();
    const req = { id: String(teacher._id), user: teacher, params: { courseId: String(course._id), lectureId: String(lecture._id) }, body: { quizMaxAttempts: 1, quizPassPercentage: 80 } };
    const forbidden = response(); await updateQuizSettings({ ...req, id: String(student._id), user: student }, forbidden); expect(forbidden.status).toHaveBeenCalledWith(403);
    const invalid = response(); await updateQuizSettings({ ...req, body: { quizMaxAttempts: 0, quizPassPercentage: 101 } }, invalid); expect(invalid.status).toHaveBeenCalledWith(400);
    const settings = response(); await updateQuizSettings(req, settings); expect(payload(settings).quizMaxAttempts).toBe(1);
    const attempt = { ...req, id: String(student._id), user: student, body: { answers: [1] } };
    const first = response(); await submitQuizResult(attempt, first); expect(payload(first)).toMatchObject({ remainingAttempts: 0, maxAttempts: 1, passed: false });
    const limited = response(); await submitQuizResult(attempt, limited); expect(limited.status).toHaveBeenCalledWith(429);
    await updateQuizSettings({ ...req, body: { quizMaxAttempts: 2, quizPassPercentage: 50 } }, response());
    const retry = response(); await submitQuizResult({ ...attempt, body: { answers: [0] } }, retry); expect(payload(retry)).toMatchObject({ attemptsCount: 2, passed: true, remainingAttempts: 0 });
    const result = await QuizResult.findOne({ userId: student._id, lectureId: lecture._id });
    expect(result.history.map(item => [item.passPercentage, item.passed])).toEqual([[80, false], [50, true]]);
    const dashboard = response(); await getCourseQuizResults(req, dashboard); expect(payload(dashboard).lectures[0].passPercentage).toBe(50);
    const visible = await access(); expect(payload(visible).data.quizResults[0].history).toHaveLength(2);
    expect(JSON.stringify(payload(visible))).not.toContain("correctOptionIndex");
  });

  it("paginates real enrolled students and computes current lesson and quiz progress privately", async () => {
    const lecture = await Lecture.create({ lectureTitle: "Quiz lesson", quizPassPercentage: 70, quizQuestions: [{ questionText: "Q", options: ["A", "B"], correctOptionIndex: 0 }] });
    course.lectures = [lecture._id]; await course.save(); student.enrolledCourses = [course._id]; await student.save();
    await User.insertMany(Array.from({ length: 13 }, (_, index) => ({ name: `Member ${index}`, email: `member-${course._id}-${index}@example.test`, password: "test-only", role: "student", enrolledCourses: [course._id] })));
    await CourseProgress.create({ userId: String(student._id), courseId: String(course._id), lectureProgress: [{ lectureId: String(lecture._id), viewed: true }, { lectureId: String(lecture._id), viewed: true }] });
    await QuizResult.create({ userId: student._id, courseId: course._id, lectureId: lecture._id, score: 0, totalQuestions: 1, percentage: 0, bestPercentage: 0, attemptsCount: 1 });
    const req = { id: String(teacher._id), user: teacher, params: { courseId: String(course._id) }, query: {} };
    const page = response(); await getStudentTracking(req, page); expect(payload(page).total).toBe(14); expect(payload(page).rows).toHaveLength(12);
    const end = response(); await getStudentTracking({ ...req, query: { page: "99" } }, end); expect(payload(end)).toMatchObject({ page: 2, totalPages: 2 }); expect(payload(end).rows).toHaveLength(2);
    const attention = response(); await getStudentTracking({ ...req, query: { status: "needs-attention" } }, attention); expect(payload(attention).rows).toHaveLength(1); expect(payload(attention).rows[0]).toMatchObject({ completedLessons: 1, averageScore: 0, needsAttention: true, status: "completed" });
    const literal = response(); await getStudentTracking({ ...req, query: { q: ".*" } }, literal); expect(payload(literal).rows).toHaveLength(0);
    const privateData = JSON.stringify(payload(page)); expect(privateData).not.toContain("password"); expect(privateData).not.toContain("correctOptionIndex");
    const denied = response(); await getStudentTracking({ ...req, id: String(student._id) }, denied); expect(denied.status).toHaveBeenCalledWith(403);
    const invalid = response(); await getStudentTracking({ ...req, query: { page: "-1" } }, invalid); expect(invalid.status).toHaveBeenCalledWith(400);
  });

  it("tracks a course with no quizzes without treating unrelated students as enrolled", async () => {
    student.enrolledCourses = [course._id]; await student.save();
    const res = response(); await getStudentTracking({ id: String(teacher._id), user: teacher, params: { courseId: String(course._id) }, query: {} }, res);
    expect(payload(res).total).toBe(1); expect(payload(res).rows[0]).toMatchObject({ status: "not-started", completedLessons: 0, averageScore: null });
  });

  it("includes completed purchases without a mirrored enrollment and free-course learners with activity", async () => {
    await CoursePurchase.create({ userId: student._id, courseId: course._id, amount: 250, paymentId: "test-only-purchase", status: "completed" });
    const req = { id: String(teacher._id), user: teacher, params: { courseId: String(course._id) }, query: {} };
    const paid = response(); await getStudentTracking(req, paid); expect(payload(paid).total).toBe(1);
    const free = await Course.create({ courseTitle: "Free", creator: teacher._id, coursePrice: 0 });
    await CourseProgress.create({ userId: String(student._id), courseId: String(free._id), lectureProgress: [] });
    const active = response(); await getStudentTracking({ ...req, params: { courseId: String(free._id) } }, active); expect(payload(active).total).toBe(1);
    const admin = response(); await getStudentTracking({ ...req, id: String(student._id), user: { role: "admin" } }, admin); expect(payload(admin).total).toBe(1);
  });

  it("scopes the question inbox to owned courses and supports replies, resolution and reopening", async () => {
    const lecture = await Lecture.create({ lectureTitle: "Questions" }); course.lectures = [lecture._id]; await course.save();
    const other = await Course.create({ courseTitle: "Private other course", creator: student._id, lectures: [lecture._id] });
    const question = await LectureComment.create({ courseId: course._id, lectureId: lecture._id, userId: student._id, text: "Why does this work?" });
    await LectureComment.create({ courseId: other._id, lectureId: lecture._id, userId: student._id, text: "Private question" });
    await LectureComment.create({ courseId: course._id, lectureId: lecture._id, userId: teacher._id, text: "Announcement" });
    const reply = await LectureComment.create({ courseId: course._id, lectureId: lecture._id, userId: teacher._id, parentCommentId: question._id, text: "Here is the explanation." });
    const req = { id: String(teacher._id), user: teacher, query: { status: "open" }, params: { courseId: String(course._id), commentId: String(question._id) }, body: { resolved: true } };
    const inbox = response(); await getQuestionInbox(req, inbox); expect(payload(inbox).total).toBe(1); expect(payload(inbox).rows[0].replies[0].text).toBe("Here is the explanation."); expect(JSON.stringify(payload(inbox))).not.toContain("Private question");
    const denied = response(); await resolveQuestion({ ...req, id: String(student._id), user: student }, denied); expect(denied.status).toHaveBeenCalledWith(403);
    const nested = response(); await resolveQuestion({ ...req, params: { ...req.params, commentId: String(reply._id) } }, nested); expect(nested.status).toHaveBeenCalledWith(404);
    const resolved = response(); await resolveQuestion(req, resolved); expect(payload(resolved).question.resolvedAt).toBeTruthy();
    const empty = response(); await getQuestionInbox(req, empty); expect(payload(empty).total).toBe(0);
    await resolveQuestion({ ...req, body: { resolved: false } }, response());
    const open = response(); await getQuestionInbox(req, open); expect(payload(open).total).toBe(1);
    const literal = response(); await getQuestionInbox({ ...req, query: { q: ".*" } }, literal); expect(payload(literal).total).toBe(0);
    await LectureComment.insertMany(Array.from({ length: 12 }, (_, index) => ({ courseId: course._id, lectureId: lecture._id, userId: student._id, text: `New question ${index}` })));
    const lastPage = response(); await getQuestionInbox({ ...req, query: { page: "2" } }, lastPage); expect(payload(lastPage)).toMatchObject({ page: 2, total: 13 }); expect(payload(lastPage).rows).toHaveLength(1); expect(String(payload(lastPage).rows[0]._id)).toBe(String(question._id));
  });

  it("saves units atomically, rejects stale or unauthorized edits, and safely removes references", async () => {
    const lessons = await Lecture.create([{ lectureTitle: "Intro" }, { lectureTitle: "Motion" }]);
    course.lectures = lessons.map(item => item._id); await course.save();
    const ids = lessons.map(item => String(item._id));
    const req = { id: String(teacher._id), user: teacher, params: { courseId: String(course._id) }, body: { revision: course.__v, unassignedLectureIds: [], units: [{ title: "Fundamentals", lectureIds: ids.slice().reverse() }] } };
    const forbidden = response(); await updateCurriculum({ ...req, id: String(student._id), user: student }, forbidden);
    expect(forbidden.status).toHaveBeenCalledWith(403);
    const otherInstructor = response(); await updateCurriculum({ ...req, id: String(student._id) }, otherInstructor);
    expect(otherInstructor.status).toHaveBeenCalledWith(403);
    const invalid = response(); await updateCurriculum({ ...req, body: { ...req.body, unassignedLectureIds: [ids[0]] } }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
    const saved = response(); await updateCurriculum(req, saved); expect(saved.status).toHaveBeenCalledWith(200);
    let latest = await Course.findById(course._id);
    expect(latest.lectures.map(String)).toEqual(ids.slice().reverse());
    expect(latest.units[0].title).toBe("Fundamentals");
    const stale = response(); await updateCurriculum(req, stale); expect(stale.status).toHaveBeenCalledWith(409);
    student.enrolledCourses = [course._id]; await student.save();
    const visible = await access(); expect(payload(visible).data.courseDetails.units[0].title).toBe("Fundamentals");
    const deleted = response(); await removeLecture({ params: { lectureId: ids[0] } }, deleted);
    expect(deleted.status).toHaveBeenCalledWith(200);
    latest = await Course.findById(course._id);
    expect(latest.lectures.map(String)).toEqual([ids[1]]);
    expect(latest.units[0].lectureIds.map(String)).toEqual([ids[1]]);
    const ungrouped = response(); await updateCurriculum({ ...req, body: { revision: latest.__v, units: [], unassignedLectureIds: [ids[1]] } }, ungrouped);
    expect(ungrouped.status).toHaveBeenCalledWith(200);
    expect(await Lecture.findById(ids[1])).not.toBeNull();
  });

  it("allows one concurrent structure save and keeps newly created lessons in canonical order", async () => {
    const lesson = await Lecture.create({ lectureTitle: "Organized" });
    course.lectures = [lesson._id]; await course.save();
    const req = { id: String(teacher._id), user: teacher, params: { courseId: String(course._id) }, body: { revision: course.__v, unassignedLectureIds: [], units: [{ title: "Unit", lectureIds: [String(lesson._id)] }] } };
    const responses = [response(), response()];
    await Promise.all(responses.map(res => updateCurriculum(req, res)));
    expect(responses.map(res => res.status.mock.calls.at(-1)[0]).sort()).toEqual([200, 409]);
    const added = response(); await createLecture({ ...req, body: { lectureTitle: "New unassigned" } }, added);
    expect(added.status).toHaveBeenCalledWith(201);
    const latest = await Course.findById(course._id).populate("lectures");
    expect(latest.lectures.map(item => item.lectureTitle)).toEqual(["New unassigned", "Organized"]);
    const denied = response(); await reorderLecture({ ...req, params: { ...req.params, lectureId: String(lesson._id) }, body: { direction: "up" } }, denied);
    expect(denied.status).toHaveBeenCalledWith(409);
  });

  it("deletes a lesson from legacy documents without a units field", async () => {
    const lecture = await Lecture.create({ lectureTitle: "Legacy" });
    await Course.collection.updateOne({ _id: course._id }, { $set: { lectures: [lecture._id] }, $unset: { units: "" } });
    const res = response(); await removeLecture({ params: { lectureId: String(lecture._id) } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const latest = await Course.findById(course._id); expect(latest.lectures).toHaveLength(0); expect(latest.units).toHaveLength(0);
  });

  it("keeps playback private, validates lesson ownership, and derives completion from saved quizzes", async () => {
    const lecture = await Lecture.create({ lectureTitle: "First lesson", quizQuestions: [{ questionText: "One plus one?", options: ["2", "3"], correctOptionIndex: 0 }] });
    course.lectures = [lecture._id];
    await course.save();
    const req = { id: String(student._id), user: student, params: { courseId: String(course._id), lectureId: String(lecture._id) }, body: { position: 42, duration: 120 }, query: {} };
    const denied = response();
    await saveLearningPosition(req, denied);
    expect(denied.status).toHaveBeenCalledWith(403);
    student.enrolledCourses = [course._id]; await student.save();
    const invalid = response();
    await saveLearningPosition({ ...req, body: { position: 130, duration: 120 } }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
    const wrongLecture = response();
    await updateCourseProgress({ ...req, params: { ...req.params, lectureId: String(new mongoose.Types.ObjectId()) } }, wrongLecture);
    expect(wrongLecture.status).toHaveBeenCalledWith(404);
    const saved = response(); await saveLearningPosition(req, saved);
    expect(saved.status).toHaveBeenCalledWith(200);
    let loaded = await access();
    expect(payload(loaded).data.positions[0].position).toBe(42);
    expect(payload(loaded).data.completed).toBe(false);
    const viewed = response(); await updateCourseProgress(req, viewed);
    expect(viewed.status).toHaveBeenCalledWith(200);
    const premature = response(); await markAsCompleted(req, premature);
    expect(premature.status).toHaveBeenCalledWith(409);
    const attempted = response(); await submitQuizResult({ ...req, body: { answers: [1] } }, attempted);
    expect(attempted.status).toHaveBeenCalledWith(200);
    loaded = await access();
    expect(payload(loaded).data.completed).toBe(true);
    expect(payload(loaded).data.quizCompleted[String(lecture._id)]).toBe(true);
    expect(payload(loaded).data.quizResults[0].percentage).toBe(0);
    const listing = response(); await getMyLearning(req, listing);
    expect(payload(listing).counts.completed).toBe(1);
    expect(payload(listing).courses[0].resumeLectureId.toString()).toBe(String(lecture._id));
    expect(JSON.stringify(payload(listing))).not.toContain("correctOptionIndex");
    const outsider = response(); await getMyLearning({ ...req, id: String(teacher._id) }, outsider);
    expect(payload(outsider).courses).toEqual([]);
  });

  it("registers a student, blocks unverified login, verifies the signed token and sets a login cookie", async () => {
    vi.stubEnv("SECRET_KEY", "isolated-test-secret-not-for-production");
    vi.stubEnv("FRONTEND_URL", "http://localhost:5173");
    vi.stubEnv("ALLOW_DEV_VERIFICATION_LINKS", "true");
    const body = { name: "New Student", email: "new-student@example.test", password: "Test-password-123", role: "admin" };
    try {
      const registration = response();
      await register({ body }, registration);
      expect(registration.status).toHaveBeenCalledWith(201);
      const created = await User.findOne({ email: body.email });
      expect(created.role).toBe("student");
      expect(created.password).not.toBe(body.password);
      const blocked = response();
      await login({ body }, blocked);
      expect(blocked.status).toHaveBeenCalledWith(403);
      expect(blocked.cookie).not.toHaveBeenCalled();
      const verification = response();
      await verifyEmail({ params: { token: payload(registration).verificationPath.split("/").at(-1) } }, verification);
      expect((await User.findById(created._id)).emailVerified).toBe(true);
      const signedIn = response();
      await login({ body }, signedIn);
      expect(signedIn.cookie).toHaveBeenCalledWith("token", expect.any(String), expect.objectContaining({ httpOnly: true }));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps paid content locked while pending, then grants access and notifies exactly once", async () => {
    const order = await request();
    expect((await access()).status).toHaveBeenCalledWith(403);
    expect(payload(await review(order)).status).toBe("completed");
    expect((await access()).status).toHaveBeenCalledWith(200);
    expect((await User.findById(student._id)).enrolledCourses.map(String)).toEqual([String(course._id)]);
    expect((await Course.findById(course._id)).enrolledStudents.map(String)).toEqual([String(student._id)]);
    expect(payload(await review(order)).status).toBe("completed");
    expect(await Notification.countDocuments({ userId: student._id })).toBe(1);
    expect(await AuditLog.countDocuments({ targetId: String(order._id) })).toBe(1);
  });

  it("reuses one pending order for simultaneous requests", async () => {
    const orders = await Promise.all([request(), request(), request()]);
    expect(new Set(orders.map((order) => String(order._id))).size).toBe(1);
    expect(await CoursePurchase.countDocuments({ courseId: course._id, status: "pending" })).toBe(1);
  });

  it("rejects an order without granting access and cannot approve it later", async () => {
    const order = await request();
    expect(payload(await review(order, "reject")).status).toBe("failed");
    expect((await access()).status).toHaveBeenCalledWith(403);
    expect((await review(order)).status).toHaveBeenCalledWith(409);
  });

  it("denies a different instructor and the admin permission to confirm teacher funds", async () => {
    const order = await request();
    expect((await review(order, "approve", { _id: student._id, role: "instructor" })).status).toHaveBeenCalledWith(404);
    expect((await review(order, "approve", { _id: student._id, role: "admin" })).status).toHaveBeenCalledWith(403);
    expect((await CoursePurchase.findById(order._id)).status).toBe("pending");
  });

  it("rolls back both enrollment writes if the final order update fails", async () => {
    const order = await request();
    vi.spyOn(CoursePurchase, "findOneAndUpdate").mockRejectedValueOnce(new Error("Injected final write failure"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await review(order)).status).toHaveBeenCalledWith(500);
    expect((await User.findById(student._id)).enrolledCourses).toHaveLength(0);
    expect((await Course.findById(course._id)).enrolledStudents).toHaveLength(0);
    expect((await CoursePurchase.findById(order._id)).status).toBe("pending");
    expect(await Notification.countDocuments({ userId: student._id })).toBe(0);
    expect(await AuditLog.countDocuments({ targetId: String(order._id) })).toBe(0);
  });

  it("rejects a pending order after unpublishing without granting access", async () => {
    const order = await request();
    await Course.findByIdAndUpdate(course._id, { isPublished: false });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(payload(await review(order, "reject")).status).toBe("failed");
    expect((await CoursePurchase.findById(order._id)).status).toBe("failed");
    expect((await User.findById(student._id)).enrolledCourses).toHaveLength(0);
    expect((await Course.findById(course._id)).enrolledStudents).toHaveLength(0);
    expect(await Notification.countDocuments({ userId: student._id, type: "manual-order-rejected" })).toBe(1);
  });

  it.each(["unpublished", "suspended"])("still blocks approval when %s but permits rejection", async (condition) => {
    const order = await request();
    if (condition === "unpublished") await Course.findByIdAndUpdate(course._id, { isPublished: false });
    else await User.findByIdAndUpdate(student._id, { status: "suspended" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await review(order)).status).toHaveBeenCalledWith(409);
    expect((await CoursePurchase.findById(order._id)).status).toBe("pending");
    expect(payload(await review(order, "reject")).status).toBe("failed");
    expect((await User.findById(student._id)).enrolledCourses).toHaveLength(0);
  });

  it("still denies rejection by another instructor after unpublishing", async () => {
    const order = await request();
    await Course.findByIdAndUpdate(course._id, { isPublished: false });
    expect((await review(order, "reject", { _id: student._id, role: "instructor" })).status).toHaveBeenCalledWith(404);
    expect((await CoursePurchase.findById(order._id)).status).toBe("pending");
  });

  it("saves and publishes a paid course when the optional level is left empty", async () => {
    const lecture = await Lecture.create({ lectureTitle: "Test lesson" });
    await Course.findByIdAndUpdate(course._id, { isPublished: false, lectures: [lecture._id] });
    const saved = response();
    await editCourse({ params: { courseId: String(course._id) }, body: { courseLevel: "", coursePrice: "250" } }, saved);
    expect(saved.status).toHaveBeenCalledWith(200);
    expect((await Course.findById(course._id)).courseLevel).toBeUndefined();
    const published = response();
    await togglePublishCourse({ id: String(teacher._id), params: { courseId: String(course._id) }, query: { publish: "true" }, ip: "127.0.0.1" }, published);
    expect(published.status).toHaveBeenCalledWith(200);
    expect((await Course.findById(course._id)).isPublished).toBe(true);
  });

  it.each([{ courseLevel: "invalid" }, { coursePrice: "not-a-number" }, { coursePrice: "-5" }])("rejects invalid course settings before updating: %j", async (body) => {
    const res = response();
    await editCourse({ params: { courseId: String(course._id) }, body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect((await Course.findById(course._id)).coursePrice).toBe(250);
  });
});
