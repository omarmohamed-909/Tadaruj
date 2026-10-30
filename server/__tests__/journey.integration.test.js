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
import { getCourseProgress, updateCourseProgress, markAsCompleted, submitQuizResult, saveLearningPosition, getMyLearning } from "../controllers/courseProgress.controller.js";
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
