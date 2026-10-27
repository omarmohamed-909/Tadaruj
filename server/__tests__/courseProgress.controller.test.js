import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/courseProgress.js", () => ({
  CourseProgress: {
    findOne: vi.fn(),
  },
}));

vi.mock("../models/lectureComment.model.js", () => ({
  LectureComment: {
    create: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("../models/notification.model.js", () => ({
  Notification: {
    create: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("../models/course.model.js", () => ({
  Course: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/lecture.model.js", () => ({
  Lecture: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/coursePurchase.model.js", () => ({
  CoursePurchase: {
    findOne: vi.fn(),
  },
}));

vi.mock("../models/user.model.js", () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/quizResult.model.js", () => ({
  QuizResult: { findOne: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn() },
}));

vi.mock("../utils/cloudinary.js", () => ({ getProtectedMediaUrl: vi.fn((url) => url) }));

import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import {
  addLectureComment,
  getCommentNotifications,
  markAllCommentNotificationsAsRead,
  markCommentNotificationAsRead,
  submitQuizResult,
} from "../controllers/courseProgress.controller.js";
import { QuizResult } from "../models/quizResult.model.js";

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  id: "student_1",
  user: { name: "Student One", role: "student" },
  ...overrides,
});

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const mockLectureTitleLookup = (lecture) => {
  const lean = vi.fn().mockResolvedValue(lecture);
  const select = vi.fn().mockReturnValue({ lean });
  Lecture.findById.mockReturnValue({ select });
};

const mockPopulatedCommentLookup = (comment) => {
  const secondPopulate = vi.fn().mockResolvedValue(comment);
  const firstPopulate = vi.fn().mockReturnValue({ populate: secondPopulate });
  LectureComment.findById.mockReturnValue({ populate: firstPopulate });
};

beforeEach(() => {
  vi.clearAllMocks();
  User.findById.mockReturnValue({
    select: vi.fn().mockResolvedValue({ enrolledCourses: [] }),
  });
  CoursePurchase.findOne.mockResolvedValue(null);
});

describe("addLectureComment notifications", () => {
  it("creates a notification for the course creator on a root comment", async () => {
    const courseId = "507f1f77bcf86cd799439011";
    const lectureId = "lecture_1";
    const req = makeReq({
      params: { courseId, lectureId },
      body: { text: "I have a question" },
    });
    const res = makeRes();

    Course.findById.mockResolvedValue({
      _id: courseId,
      creator: "instructor_1",
      coursePrice: 0,
      lectures: [lectureId],
      courseTitle: "Algebra Basics",
    });
    mockLectureTitleLookup({ _id: lectureId, lectureTitle: "Introduction" });
    LectureComment.create.mockResolvedValue({ _id: "comment_1" });
    mockPopulatedCommentLookup({ _id: "comment_1", text: "I have a question" });
    Notification.create.mockResolvedValue({});

    await addLectureComment(req, res);

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "instructor_1",
        type: "comment",
        link: `/course-progress/${courseId}?lectureId=${lectureId}`,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("creates a notification for the parent comment author on a reply", async () => {
    const courseId = "507f1f77bcf86cd799439011";
    const lectureId = "lecture_1";
    const req = makeReq({
      id: "instructor_1",
      user: { name: "Instructor One", role: "instructor" },
      params: { courseId, lectureId },
      body: { text: "Here is the answer", parentCommentId: "parent_comment_1" },
    });
    const res = makeRes();

    Course.findById.mockResolvedValue({
      _id: courseId,
      creator: "instructor_1",
      coursePrice: 99,
      lectures: [lectureId],
      courseTitle: "Algebra Basics",
    });
    mockLectureTitleLookup({ _id: lectureId, lectureTitle: "Introduction" });
    LectureComment.findOne.mockResolvedValue({
      _id: "parent_comment_1",
      userId: "student_1",
    });
    LectureComment.create.mockResolvedValue({ _id: "comment_2" });
    mockPopulatedCommentLookup({ _id: "comment_2", text: "Here is the answer" });
    Notification.create.mockResolvedValue({});

    await addLectureComment(req, res);

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student_1",
        type: "comment-reply",
        link: `/course-progress/${courseId}?lectureId=${lectureId}`,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("still returns success when notification persistence fails", async () => {
    const courseId = "507f1f77bcf86cd799439011";
    const lectureId = "507f1f77bcf86cd799439012";
    const req = makeReq({
      params: { courseId, lectureId },
      body: { text: "I have a question" },
    });
    const res = makeRes();

    Course.findById.mockResolvedValue({
      _id: courseId,
      creator: "instructor_1",
      coursePrice: 0,
      lectures: [lectureId],
      courseTitle: "Algebra Basics",
    });
    mockLectureTitleLookup({ _id: lectureId, lectureTitle: "Introduction" });
    LectureComment.create.mockResolvedValue({ _id: "comment_3" });
    mockPopulatedCommentLookup({ _id: "comment_3", text: "I have a question" });
    Notification.create.mockRejectedValue(new Error("db error"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await addLectureComment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Comment added successfully." })
    );
    consoleErrorSpy.mockRestore();
  });
});

describe("server-side quiz grading", () => {
  const courseId = "507f1f77bcf86cd799439011";
  const lectureId = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    Course.findById.mockResolvedValue({ creator: "instructor_1", coursePrice: 0, lectures: [lectureId] });
    Lecture.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ quizQuestions: [
      { options: ["A", "B"], correctOptionIndex: 1 },
      { options: ["C", "D"], correctOptionIndex: 0 },
    ] }) });
    QuizResult.findOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });
    QuizResult.create.mockResolvedValue({});
  });

  it("ignores client score fields and grades submitted answers", async () => {
    const res = makeRes();
    await submitQuizResult(makeReq({ params: { courseId, lectureId }, body: { answers: [1, 1], score: 99, totalQuestions: 99 } }), res);
    expect(QuizResult.create).toHaveBeenCalledWith(expect.objectContaining({ score: 1, totalQuestions: 2, percentage: 50 }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ score: 1, totalQuestions: 2 }));
  });

  it("rejects missing or invalid answers", async () => {
    const res = makeRes();
    await submitQuizResult(makeReq({ params: { courseId, lectureId }, body: { answers: [9] } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(QuizResult.create).not.toHaveBeenCalled();
  });
});

describe("comment notification reads", () => {
  it("returns persisted notifications for the logged-in user", async () => {
    const req = makeReq({ id: "student_1" });
    const res = makeRes();
    const lean = vi.fn().mockResolvedValue([{ _id: "notification_1", isRead: false }]);
    const limit = vi.fn().mockReturnValue({ lean });
    const sort = vi.fn().mockReturnValue({ limit });
    Notification.find.mockReturnValue({ sort });

    await getCommentNotifications(req, res);

    expect(Notification.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student_1",
        type: { $in: ["comment", "comment-reply", "manual-order-approved", "manual-order-rejected"] },
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      notifications: [{ _id: "notification_1", isRead: false }],
    });
  });

  it("marks a notification as read for the current user", async () => {
    const req = makeReq({
      id: "student_1",
      params: { notificationId: "507f1f77bcf86cd799439013" },
    });
    const res = makeRes();
    const lean = vi.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439013", isRead: true });
    Notification.findOneAndUpdate.mockReturnValue({ lean });

    await markCommentNotificationAsRead(req, res);

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "507f1f77bcf86cd799439013",
        userId: "student_1",
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          isRead: true,
          readAt: expect.any(Date),
        }),
      }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 when notification id is invalid", async () => {
    const req = makeReq({
      id: "student_1",
      params: { notificationId: "invalid-id" },
    });
    const res = makeRes();

    await markCommentNotificationAsRead(req, res);

    expect(Notification.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid notification id.",
    });
  });

  it("marks all unread comment notifications as read for the current user", async () => {
    const req = makeReq({ id: "student_1" });
    const res = makeRes();
    Notification.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 2 });

    await markAllCommentNotificationsAsRead(req, res);

    expect(Notification.updateMany).toHaveBeenCalledWith(
      {
        userId: "student_1",
        isRead: false,
        type: { $in: ["comment", "comment-reply", "manual-order-approved", "manual-order-rejected"] },
      },
      {
        $set: expect.objectContaining({
          isRead: true,
          readAt: expect.any(Date),
        }),
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "All notifications marked as read.",
    });
  });
});
