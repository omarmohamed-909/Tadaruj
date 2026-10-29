import { reportError } from "../utils/logger.js";
import mongoose from "mongoose";
import { CourseProgress } from "../models/courseProgress.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { Notification } from "../models/notification.model.js";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { QuizResult } from "../models/quizResult.model.js";
import { LearningPosition } from "../models/learningPosition.model.js";
import { learningSummary } from "../utils/learningSummary.js";
import { getProtectedMediaUrl } from "../utils/cloudinary.js";

const MAX_QUIZ_ATTEMPTS = 3;

const ensureCourseAccess = async (courseId, userId, role) => {
  const [course, user, purchase] = await Promise.all([
    Course.findById(courseId),
    User.findById(userId).select("enrolledCourses"),
    CoursePurchase.findOne({ courseId, userId, status: "completed" }),
  ]);

  if (!course) {
    return { error: { status: 404, message: "Course not found" } };
  }

  const isCourseCreator = course.creator?.toString() === userId;
  if (isCourseCreator || role === "admin") {
    return { course };
  }

  const isFreeCourse = !course.coursePrice || course.coursePrice <= 0;
  const hasManualAccess = user?.enrolledCourses?.some(
    (enrolledCourseId) => enrolledCourseId.toString() === courseId
  ) ?? false;

  if (!isFreeCourse && !purchase && !hasManualAccess) {
    return {
      error: {
        status: 403,
        message: "You do not have access to this course.",
      },
    };
  }

  return { course };
};

const ensureLectureBelongsToCourse = (course, lectureId) =>
  course?.lectures?.some((courseLectureId) => courseLectureId.toString() === lectureId);

export const saveLearningPosition = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const { position, duration } = req.body;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lectureId) ||
        typeof position !== "number" || typeof duration !== "number" ||
        !Number.isFinite(position) || !Number.isFinite(duration) || position < 0 ||
        duration <= 0 || duration > 86400 || position > duration) {
      return res.status(400).json({ message: "Invalid playback position." });
    }
    const access = await ensureCourseAccess(courseId, req.id, req.user?.role);
    if (access.error) return res.status(access.error.status).json({ message: access.error.message });
    if (!ensureLectureBelongsToCourse(access.course, lectureId)) return res.status(404).json({ message: "Lecture not found in this course." });
    const filter = { userId: req.id, courseId, lectureId };
    const update = { $set: { position, duration } };
    try {
      await LearningPosition.findOneAndUpdate(filter, update, { upsert: true, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      await LearningPosition.findOneAndUpdate(filter, update, { runValidators: true });
    }
    // Playback position is a convenience; it never grants completion or access.
    return res.status(200).json({ success: true });
  } catch (error) {
    reportError("learning.save_position.failed", error);
    return res.status(500).json({ message: "Could not save playback position." });
  }
};

export const getMyLearning = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select("enrolledCourses").lean();
    const ids = user?.enrolledCourses || [];
    const [courses, progresses, results, positions] = await Promise.all([
      Course.find({ _id: { $in: ids } }).select("courseTitle courseThumbnail subject creator lectures")
        .populate({ path: "creator", select: "name" })
        .populate({ path: "lectures", select: "lectureTitle quizQuestions._id" }).lean(),
      CourseProgress.find({ userId, courseId: { $in: ids.map(String) } }).lean(),
      QuizResult.find({ userId, courseId: { $in: ids } }).select("courseId lectureId attemptsCount").lean(),
      LearningPosition.find({ userId, courseId: { $in: ids } }).select("courseId lectureId position duration updatedAt").sort({ updatedAt: -1 }).lean(),
    ]);
    const items = courses.map(course => {
      const id = String(course._id);
      const progress = progresses.find(item => item.courseId === id);
      const summary = learningSummary(course.lectures, progress?.lectureProgress, results.filter(item => String(item.courseId) === id));
      const latest = positions.find(item => String(item.courseId) === id && course.lectures.some(lecture => String(lecture._id) === String(item.lectureId)));
      const started = Boolean(latest || progress?.lectureProgress?.length || Object.keys(summary.quizCompleted).length);
      const next = course.lectures.find(lecture => !progress?.lectureProgress?.some(item => item.lectureId === String(lecture._id) && item.viewed) || (lecture.quizQuestions?.length && !summary.quizCompleted[String(lecture._id)]));
      const resume = course.lectures.find(lecture => String(lecture._id) === String(latest?.lectureId)) || next || course.lectures[0];
      const { lectures: _lectures, ...publicCourse } = course;
      return { ...publicCourse, ...summary, status: summary.completed ? "completed" : started ? "in-progress" : "not-started", lastActivity: latest?.updatedAt || null, resumeLectureId: resume?._id || null, resumeLectureTitle: resume?.lectureTitle || "", resumePosition: latest?.position || 0 };
    }).sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0) || String(a._id).localeCompare(String(b._id)));
    const counts = { all: items.length, "in-progress": 0, completed: 0, "not-started": 0 };
    items.forEach(item => counts[item.status]++);
    const filtered = ["in-progress", "completed", "not-started"].includes(req.query.status) ? items.filter(item => item.status === req.query.status) : items;
    const totalPages = Math.ceil(filtered.length / 12);
    const requestedPage = Number.parseInt(req.query.page, 10) || 1;
    const page = Math.max(1, Math.min(requestedPage, totalPages || 1));
    return res.status(200).json({ courses: filtered.slice((page - 1) * 12, page * 12), counts, page, totalPages, continueCourse: items.find(item => item.status === "in-progress") || null });
  } catch (error) {
    reportError("learning.list.failed", error);
    return res.status(500).json({ message: "Could not load your learning space." });
  }
};

const getNestedCommentIds = async ({ courseId, lectureId, rootCommentId }) => {
  const nestedIds = [rootCommentId.toString()];
  let queue = [rootCommentId.toString()];

  while (queue.length > 0) {
    const currentBatch = queue;
    queue = [];

    const childComments = await LectureComment.find({
      courseId,
      lectureId,
      parentCommentId: { $in: currentBatch },
    })
      .select("_id")
      .lean();

    const childIds = childComments.map((comment) => comment._id.toString());
    if (!childIds.length) {
      continue;
    }

    nestedIds.push(...childIds);
    queue = childIds;
  }

  return nestedIds;
};

const commentNotificationTypes = ["comment", "comment-reply", "manual-order-approved", "manual-order-rejected"];

const createCommentNotification = async ({
  recipientUserId,
  actorUserId,
  actorName,
  course,
  lecture,
  isReply,
}) => {
  if (!recipientUserId || recipientUserId.toString() === actorUserId?.toString()) {
    return;
  }

  const lectureTitle = lecture?.lectureTitle || "a lecture";
  const courseTitle = course?.courseTitle || "your course";
  const message = isReply
    ? `${actorName || "Someone"} replied to your comment in ${lectureTitle} for ${courseTitle}.`
    : `${actorName || "Someone"} commented on ${lectureTitle} in ${courseTitle}.`;

  await Notification.create({
    userId: recipientUserId,
    message,
    type: isReply ? "comment-reply" : "comment",
    link: `/course-progress/${course._id.toString()}?lectureId=${lecture._id.toString()}`,
  });
};

export const getCommentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.id,
      type: { $in: commentNotificationTypes },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      notifications,
    });
  } catch (error) {
    reportError("course_progress.get_comment_notifications.failed", error);
    return res.status(500).json({
      message: "Failed to load comment notifications.",
    });
  }
};

export const markCommentNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        message: "Invalid notification id.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: req.id,
        type: { $in: commentNotificationTypes },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      notification,
      message: "Notification marked as read.",
    });
  } catch (error) {
    reportError("course_progress.mark_comment_notification_as_read.failed", error);
    return res.status(500).json({
      message: "Failed to update notification.",
    });
  }
};

export const markAllCommentNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        userId: req.id,
        isRead: false,
        type: { $in: commentNotificationTypes },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      message: "All notifications marked as read.",
    });
  } catch (error) {
    reportError("course_progress.mark_all_comment_notifications_as_read.failed", error);
    return res.status(500).json({
      message: "Failed to update notifications.",
    });
  }
};

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    //step-1 fetch the user course progress
    let courseProgress = await CourseProgress.findOne({
      courseId,
      userId,
    }).populate("courseId");

    const courseDetails = await Course.findById(courseId)
      .populate("lectures")
      .populate({ path: "creator", select: "name photoUrl emailVerified" });
    const safeCourseDetails = courseDetails?.toObject ? courseDetails.toObject() : courseDetails;
    if (safeCourseDetails) safeCourseDetails.lectures = (safeCourseDetails.lectures || []).map((lecture) => ({
      ...lecture,
      videoUrl: getProtectedMediaUrl(lecture.videoUrl, lecture.publicId, "video"),
      attachmentUrl: getProtectedMediaUrl(lecture.attachmentUrl, lecture.attachmentPublicId, "raw"),
    }));
    if (safeCourseDetails && req.user?.role !== "admin" && String(accessResult.course.creator) !== String(userId)) {
      safeCourseDetails.lectures = (safeCourseDetails.lectures || []).map((lecture) => ({
        ...lecture,
        quizQuestions: (lecture.quizQuestions || []).map((question) => {
          const { correctOptionIndex: _answer, ...safeQuestion } = question;
          return safeQuestion;
        }),
      }));
    }

    const [quizResults, positions] = await Promise.all([
      QuizResult.find({ userId, courseId }).select("lectureId attemptsCount bestPercentage percentage").lean(),
      LearningPosition.find({ userId, courseId }).select("lectureId position duration updatedAt").sort({ updatedAt: -1 }).lean(),
    ]);
    const summary = learningSummary(safeCourseDetails.lectures, courseProgress?.lectureProgress, quizResults);
    return res.status(200).json({
      data: {
        courseDetails: safeCourseDetails,
        progress: courseProgress?.lectureProgress || [],
        ...summary,
        quizResults,
        positions,
      },
    });
  } catch (error) {
    reportError("course_progress.get_course_progress.failed", error);
    return res.status(500).json({ message: "Failed to load course progress." });
  }
};

export const updateCourseProgress = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    if (!ensureLectureBelongsToCourse(accessResult.course, lectureId)) {
      return res.status(404).json({ message: "Lecture not found in this course." });
    }
    // fetch or create course progress
    let courseProgress = await CourseProgress.findOne({ courseId, userId });

    if (!courseProgress) {
      // if no progress exist, create a new record
      courseProgress = new CourseProgress({
        userId,
        courseId,
        completed: false,
        lectureProgress: [],
      });
    }

    // find the lecture progress in the course progress
    const lectureIndex = courseProgress.lectureProgress.findIndex(
      (lecture) => lecture.lectureId === lectureId
    );

    if (lectureIndex !== -1) {
      // if lecture already exist, update it status
      courseProgress.lectureProgress[lectureIndex].viewed = true;
    } else {
      // add new lecture progress
      courseProgress.lectureProgress.push({
        lectureId,
        viewed: true,
      });
    }

    const [lectures, results] = await Promise.all([
      Lecture.find({ _id: { $in: accessResult.course.lectures } }).select("quizQuestions"),
      QuizResult.find({ userId, courseId }).select("lectureId attemptsCount"),
    ]);
    courseProgress.completed = learningSummary(lectures, courseProgress.lectureProgress, results).completed;
    await courseProgress.save();

    return res.status(200).json({
      message: "Course progress updated successfully",
    });
  } catch (error) {
    reportError("course_progress.update_course_progress.failed", error);
    return res.status(500).json({ message: "Failed to update course progress." });
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress) {
      return res.status(404).json({
        message: "Course progress not found",
      });
    }
    const [lectures, results] = await Promise.all([
      Lecture.find({ _id: { $in: accessResult.course.lectures } }).select("quizQuestions"),
      QuizResult.find({ userId, courseId }).select("lectureId attemptsCount"),
    ]);
    if (!learningSummary(lectures, courseProgress.lectureProgress, results).completed) {
      return res.status(409).json({ message: "Finish every lesson and submit its quiz before completing this course." });
    }
    courseProgress.completed = true;
    await courseProgress.save();
    return res.status(200).json({
      message: "Course marked as completed.",
    });
  } catch (error) {
    reportError("course_progress.mark_as_completed.failed", error);
    return res.status(500).json({ message: "Failed to mark course as completed." });
  }
};

export const markAsInCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress) {
      return res.status(404).json({
        message: "Course progress not found",
      });
    }
    courseProgress.lectureProgress.map(
      (lectureProgress) => (lectureProgress.viewed = false)
    );
    courseProgress.completed = false;
    await courseProgress.save();
    return res.status(200).json({
      message: "Course marked as incompleted.",
    });
  } catch (error) {
    reportError("course_progress.mark_as_in_completed.failed", error);
    return res.status(500).json({ message: "Failed to mark course as incomplete." });
  }
};

export const getLectureComments = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    if (!ensureLectureBelongsToCourse(accessResult.course, lectureId)) {
      return res.status(404).json({
        message: "Lecture not found in this course.",
      });
    }

    const comments = await LectureComment.find({ courseId, lectureId })
      .populate({ path: "userId", select: "name photoUrl role" })
      .populate({ path: "replyToUserId", select: "name photoUrl role" })
      .sort({ isPinned: -1, createdAt: -1 });

    return res.status(200).json({
      comments,
    });
  } catch (error) {
    reportError("course_progress.get_lecture_comments.failed", error);
    return res.status(500).json({
      message: "Failed to load comments.",
    });
  }
};

export const addLectureComment = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;
    const text = req.body?.text?.trim();
    const parentCommentId = req.body?.parentCommentId;

    if (!text) {
      return res.status(400).json({
        message: "Comment text is required.",
      });
    }

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    if (!ensureLectureBelongsToCourse(accessResult.course, lectureId)) {
      return res.status(404).json({
        message: "Lecture not found in this course.",
      });
    }

    const lecture = await Lecture.findById(lectureId).select("lectureTitle").lean();
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found.",
      });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await LectureComment.findOne({
        _id: parentCommentId,
        courseId,
        lectureId,
      });

      if (!parentComment) {
        return res.status(404).json({
          message: "Parent comment not found.",
        });
      }
    }

    const comment = await LectureComment.create({
      courseId,
      lectureId,
      userId,
      text,
      parentCommentId: parentComment ? parentComment._id : null,
      replyToUserId: parentComment ? parentComment.userId : null,
    });

    const recipientUserId = parentComment
      ? parentComment.userId
      : accessResult.course.creator;

    try {
      await createCommentNotification({
        recipientUserId,
        actorUserId: userId,
        actorName: req.user?.name,
        course: accessResult.course,
        lecture,
        isReply: Boolean(parentComment),
      });
    } catch (notificationError) {
      reportError("course_progress.add_lecture_comment.notification_failed", notificationError);
    }

    const populatedComment = await LectureComment.findById(comment._id)
      .populate({
        path: "userId",
        select: "name photoUrl role",
      })
      .populate({
        path: "replyToUserId",
        select: "name photoUrl role",
      });

    return res.status(201).json({
      comment: populatedComment,
      message: "Comment added successfully.",
    });
  } catch (error) {
    reportError("course_progress.add_lecture_comment.failed", error);
    return res.status(500).json({
      message: "Failed to add comment.",
    });
  }
};

export const deleteLectureComment = async (req, res) => {
  try {
    const { courseId, lectureId, commentId } = req.params;
    const userId = req.id;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res.status(accessResult.error.status).json({
        message: accessResult.error.message,
      });
    }

    const comment = await LectureComment.findOne({
      _id: commentId,
      courseId,
      lectureId,
    });

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found.",
      });
    }

    const isCommentOwner = comment.userId.toString() === userId;
    const isInstructor = req.user?.role === "admin" || (req.user?.role === "instructor" && accessResult.course.creator?.toString() === userId);

    if (!isCommentOwner && !isInstructor) {
      return res.status(403).json({
        message: "You cannot delete this comment.",
      });
    }

    const nestedCommentIds = await getNestedCommentIds({
      courseId,
      lectureId,
      rootCommentId: commentId,
    });

    await LectureComment.deleteMany({
      _id: { $in: nestedCommentIds },
    });

    return res.status(200).json({
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    reportError("course_progress.delete_lecture_comment.failed", error);
    return res.status(500).json({
      message: "Failed to delete comment.",
    });
  }
};

export const togglePinLectureComment = async (req, res) => {
  try {
    const { courseId, lectureId, commentId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId).select("creator lectures");
    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (req.user?.role !== "admin" && course.creator?.toString() !== userId) {
      return res.status(403).json({
        message: "Only the course instructor can pin comments.",
      });
    }

    if (!ensureLectureBelongsToCourse(course, lectureId)) {
      return res.status(404).json({
        message: "Lecture not found in this course.",
      });
    }

    const comment = await LectureComment.findOne({
      _id: commentId,
      courseId,
      lectureId,
    });

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found.",
      });
    }

    if (comment.parentCommentId) {
      return res.status(400).json({
        message: "Only top-level comments can be pinned.",
      });
    }

    if (!comment.isPinned) {
      await LectureComment.updateMany(
        { courseId, lectureId, isPinned: true },
        {
          $set: {
            isPinned: false,
            pinnedAt: null,
            pinnedByUserId: null,
          },
        }
      );

      comment.isPinned = true;
      comment.pinnedAt = new Date();
      comment.pinnedByUserId = userId;
      await comment.save();

      return res.status(200).json({
        message: "Comment pinned successfully.",
      });
    }

    comment.isPinned = false;
    comment.pinnedAt = null;
    comment.pinnedByUserId = null;
    await comment.save();

    return res.status(200).json({
      message: "Comment unpinned successfully.",
    });
  } catch (error) {
    reportError("course_progress.toggle_pin_lecture_comment.failed", error);
    return res.status(500).json({
      message: "Failed to update pinned comment.",
    });
  }
};

// POST /:courseId/lecture/:lectureId/quiz-result
// Student submits their quiz score
export const submitQuizResult = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;
    const { answers } = req.body;

    const accessResult = await ensureCourseAccess(courseId, userId, req.user?.role);
    if (accessResult.error) {
      return res
        .status(accessResult.error.status)
        .json({ message: accessResult.error.message });
    }

    if (!ensureLectureBelongsToCourse(accessResult.course, lectureId)) {
      return res.status(404).json({ message: "Lecture not found in this course." });
    }

    const lecture = await Lecture.findById(lectureId).select("quizQuestions");
    const questions = lecture?.quizQuestions || [];
    if (!questions.length || !Array.isArray(answers) || answers.length !== questions.length ||
      answers.some((answer, index) => !Number.isInteger(answer) || answer < 0 || answer >= questions[index].options.length)) {
      return res.status(400).json({ message: "Answer every quiz question with a valid option." });
    }

    const totalQuestions = questions.length;
    const score = questions.reduce((sum, question, index) => sum + Number(answers[index] === question.correctOptionIndex), 0);

    const percentage = Math.round((score / totalQuestions) * 100);
    const attemptPayload = {
      score,
      totalQuestions,
      percentage,
      submittedAt: new Date(),
    };

    const existingResult = await QuizResult.findOne({ userId, lectureId })
      .select("_id attemptsCount")
      .lean();

    if (!existingResult) {
      try { await QuizResult.create({
        userId,
        courseId,
        lectureId,
        score,
        totalQuestions,
        percentage,
        attemptsCount: 1,
        bestScore: score,
        bestPercentage: percentage,
        history: [attemptPayload],
      }); } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Quiz attempt already submitted. Refresh and try again." });
        throw error;
      }

      return res.status(200).json({
        message: "Quiz result saved.",
        attemptsCount: 1,
        maxAttempts: MAX_QUIZ_ATTEMPTS,
        remainingAttempts: MAX_QUIZ_ATTEMPTS - 1,
        score,
        totalQuestions,
      });
    } else {
      const currentAttempts = existingResult.attemptsCount || 0;

      if (currentAttempts >= MAX_QUIZ_ATTEMPTS) {
        return res.status(429).json({
          message: `Maximum ${MAX_QUIZ_ATTEMPTS} quiz attempts reached for this lecture.`,
          attemptsCount: currentAttempts,
          maxAttempts: MAX_QUIZ_ATTEMPTS,
          remainingAttempts: 0,
        });
      }

      const updatedResult = await QuizResult.findOneAndUpdate(
        { _id: existingResult._id, attemptsCount: { $lt: MAX_QUIZ_ATTEMPTS } },
        {
          $set: {
            score,
            totalQuestions,
            percentage,
          },
          $inc: { attemptsCount: 1 },
          $max: {
            bestScore: score,
            bestPercentage: percentage,
          },
          $push: {
            history: attemptPayload,
          },
        },
        { new: true }
      );
      if (!updatedResult) return res.status(429).json({ message: "Maximum quiz attempts reached." });
      const remainingAttempts = Math.max(0, MAX_QUIZ_ATTEMPTS - updatedResult.attemptsCount);

      return res.status(200).json({
        message: "Quiz result saved.",
        attemptsCount: updatedResult.attemptsCount,
        maxAttempts: MAX_QUIZ_ATTEMPTS,
        remainingAttempts,
        score,
        totalQuestions,
      });
    }
  } catch (error) {
    reportError("course_progress.submit_quiz_result.failed", error);
    return res.status(500).json({ message: "Failed to save quiz result." });
  }
};

// GET /admin/:courseId/quiz-results
// Instructor gets all students' quiz results for a course
export const getCourseQuizResults = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId).populate("lectures", "lectureTitle quizQuestions");
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    if (req.user?.role !== "admin" && course.creator?.toString() !== userId) {
      return res.status(403).json({ message: "Access denied." });
    }

    const results = await QuizResult.find({ courseId })
      .select("userId lectureId score totalQuestions percentage attemptsCount bestScore bestPercentage updatedAt")
      .populate("userId", "name email photoUrl")
      .populate("lectureId", "lectureTitle")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      courseTitle: course.courseTitle,
      lectures: course.lectures.map((lecture) => ({
        _id: lecture._id,
        lectureTitle: lecture.lectureTitle,
        totalQuestions: lecture.quizQuestions?.length ?? 0,
      })),
      results,
    });
  } catch (error) {
    reportError("course_progress.get_course_quiz_results.failed", error);
    return res.status(500).json({ message: "Failed to load quiz results." });
  }
};

// GET /admin/quiz-result/:resultId/history
// Instructor gets attempts history for one quiz result row
export const getQuizResultHistory = async (req, res) => {
  try {
    const { resultId } = req.params;
    const userId = req.id;

    const result = await QuizResult.findById(resultId)
      .select("courseId history attemptsCount")
      .lean();

    if (!result) {
      return res.status(404).json({ message: "Quiz result not found." });
    }

    const course = await Course.findById(result.courseId).select("creator").lean();
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    if (req.user?.role !== "admin" && course.creator?.toString() !== userId) {
      return res.status(403).json({ message: "Access denied." });
    }

    const sortedHistory = [...(result.history || [])].sort(
      (firstItem, secondItem) =>
        new Date(secondItem.submittedAt) - new Date(firstItem.submittedAt)
    );

    return res.status(200).json({
      attemptsCount: result.attemptsCount || sortedHistory.length || 0,
      history: sortedHistory,
    });
  } catch (error) {
    reportError("course_progress.get_quiz_result_history.failed", error);
    return res.status(500).json({ message: "Failed to load quiz attempt history." });
  }
};
