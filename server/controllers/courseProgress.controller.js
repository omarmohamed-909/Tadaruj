import mongoose from "mongoose";
import { CourseProgress } from "../models/courseProgress.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { Notification } from "../models/notification.model.js";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { QuizResult } from "../models/quizResult.model.js";
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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

    //step-2 if no progress found ,return course details with an empty progress
    if (!courseProgress) {
      return res.status(200).json({
        data: {
          courseDetails: safeCourseDetails,
          progress: [],
          completed: false,
        },
      });
    }

    // step-3 return the user's course progress alog with course details
    return res.status(200).json({
      data: {
        courseDetails: safeCourseDetails,
        progress: courseProgress.lectureProgress,
        completed: courseProgress.completed,
      },
    });
  } catch (error) {
    console.log(error);
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

    //if all lecture is complete
    const lectureProgressLength = courseProgress.lectureProgress.filter(
      (lectureProg) => lectureProg.viewed
    ).length;

    const course = await Course.findById(courseId);
    if (course.lectures.length === lectureProgressLength) {
      courseProgress.completed = true;
    }
    await courseProgress.save();

    return res.status(200).json({
      message: "Course progress updated successfully",
    });
  } catch (error) {
    console.log(error);
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
    courseProgress.lectureProgress.map(
      (lectureProgress) => (lectureProgress.viewed = true)
    );
    courseProgress.completed = true;
    await courseProgress.save();
    return res.status(200).json({
      message: "Course marked as completed.",
    });
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
      console.error("Failed to create comment notification:", notificationError);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
    return res.status(500).json({ message: "Failed to load quiz attempt history." });
  }
};
