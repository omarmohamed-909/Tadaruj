import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { reportError } from "../utils/logger.js";

const objectId = value => new mongoose.Types.ObjectId(value);
const manager = (req, course) => req.user?.role === "admin" || (req.user?.role === "instructor" && String(course.creator) === req.id);
const filters = (query, statuses) => {
  if (query.page !== undefined && (typeof query.page !== "string" || !/^[1-9]\d{0,5}$/.test(query.page))) return null;
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || (query.q !== undefined && (typeof query.q !== "string" || query.q.length > 120)) || (query.status !== undefined && !statuses.includes(query.status))) return null;
  return { page, q: (query.q || "").trim(), status: query.status || "all" };
};
const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function pageAggregate(model, pipeline, requested, pageSize = 12) {
  const count = await model.aggregate([...pipeline, { $count: "total" }]);
  const total = count[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, totalPages);
  const rows = await model.aggregate([...pipeline, { $sort: { createdAt: -1, _id: -1 } }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }]);
  return { rows, page, total, totalPages };
}

export async function updateQuizSettings(req, res) {
  try {
    const { quizMaxAttempts, quizPassPercentage } = req.body || {};
    if (!Number.isInteger(quizMaxAttempts) || quizMaxAttempts < 1 || quizMaxAttempts > 10 || !Number.isInteger(quizPassPercentage) || quizPassPercentage < 0 || quizPassPercentage > 100) return res.status(400).json({ message: "Use 1–10 attempts and a pass percentage from 0 to 100." });
    const course = await Course.findById(req.params.courseId).select("creator lectures").lean();
    if (!course || !course.lectures.some(id => String(id) === req.params.lectureId)) return res.status(404).json({ message: "Lesson not found." });
    if (!manager(req, course)) return res.status(403).json({ message: "Access denied." });
    await Lecture.updateOne({ _id: req.params.lectureId }, { $set: { quizMaxAttempts, quizPassPercentage } });
    return res.json({ quizMaxAttempts, quizPassPercentage });
  } catch (error) { reportError("teaching.quiz_settings.failed", error); return res.status(500).json({ message: "Could not save quiz settings." }); }
}

export async function getStudentTracking(req, res) {
  try {
    const options = filters(req.query, ["all", "not-started", "in-progress", "completed", "needs-attention"]);
    if (!options) return res.status(400).json({ message: "Invalid student filters." });
    const course = await Course.findById(req.params.courseId).select("creator courseTitle coursePrice lectures").populate("lectures", "lectureTitle quizQuestions._id quizPassPercentage").lean();
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!manager(req, course)) return res.status(403).json({ message: "Access denied." });
    const cid = course._id, courseId = String(cid);
    const lessonIds = course.lectures.map(item => String(item._id));
    const quizIds = course.lectures.filter(item => item.quizQuestions?.length).map(item => String(item._id));
    const pipeline = [
      { $match: { role: "student", ...(options.q ? { $or: [{ name: { $regex: escaped(options.q), $options: "i" } }, { email: { $regex: escaped(options.q), $options: "i" } }] } : {}) } },
      { $project: { name: 1, email: 1, enrolledCourses: 1, createdAt: 1 } },
      { $lookup: { from: "coursepurchases", let: { uid: "$_id" }, pipeline: [{ $match: { courseId: cid, status: "completed", $expr: { $eq: ["$userId", "$$uid"] } } }, { $limit: 1 }, { $project: { _id: 1 } }], as: "purchases" } },
      { $lookup: { from: "courseprogresses", let: { uid: { $toString: "$_id" } }, pipeline: [{ $match: { courseId, $expr: { $eq: ["$userId", "$$uid"] } } }, { $project: { lectureProgress: 1 } }], as: "progress" } },
      { $lookup: { from: "learningpositions", let: { uid: "$_id" }, pipeline: [{ $match: { courseId: cid, lectureId: { $in: course.lectures.map(item => item._id) }, $expr: { $eq: ["$userId", "$$uid"] } } }, { $sort: { updatedAt: -1 } }, { $limit: 1 }, { $project: { updatedAt: 1 } }], as: "positions" } },
      { $lookup: { from: "quizresults", let: { uid: "$_id" }, pipeline: [{ $match: { courseId: cid, lectureId: { $in: course.lectures.filter(item => item.quizQuestions?.length).map(item => item._id) }, $expr: { $eq: ["$userId", "$$uid"] } } }, { $project: { lectureId: 1, percentage: 1, bestPercentage: 1, attemptsCount: 1, updatedAt: 1 } }], as: "quizzes" } },
      { $match: { $expr: { $or: [{ $in: [cid, { $ifNull: ["$enrolledCourses", []] }] }, { $gt: [{ $size: "$purchases" }, 0] }, ...(Number(course.coursePrice || 0) <= 0 ? [{ $gt: [{ $add: [{ $size: "$progress" }, { $size: "$positions" }, { $size: "$quizzes" }] }, 0] }] : [])] } } },
      { $set: { viewed: { $setIntersection: [lessonIds, { $map: { input: { $filter: { input: { $reduce: { input: "$progress", initialValue: [], in: { $concatArrays: ["$$value", { $ifNull: ["$$this.lectureProgress", []] }] } } }, as: "item", cond: "$$item.viewed" } }, as: "item", in: "$$item.lectureId" } }] }, submitted: { $map: { input: "$quizzes", as: "quiz", in: { $toString: "$$quiz.lectureId" } } }, lastActivity: { $max: [{ $max: "$positions.updatedAt" }, { $max: "$quizzes.updatedAt" }] }, averageScore: { $avg: "$quizzes.percentage" } } },
      { $set: { completedLessons: { $size: { $setDifference: ["$viewed", { $setDifference: [quizIds, "$submitted"] }] } }, needsAttention: { $or: [{ $and: [{ $ne: ["$lastActivity", null] }, { $lt: ["$lastActivity", new Date(Date.now() - 7 * 86400000)] }] }, { $anyElementTrue: [{ $map: { input: "$quizzes", as: "quiz", in: { $lt: ["$$quiz.percentage", (quizIds.length ? { $switch: { branches: course.lectures.filter(item => item.quizQuestions?.length).map(item => ({ case: { $eq: ["$$quiz.lectureId", item._id] }, then: item.quizPassPercentage ?? 60 })), default: 60 } } : 60)] } } }] }] } } },
      { $set: { status: { $cond: [{ $and: [{ $gt: [lessonIds.length, 0] }, { $eq: ["$completedLessons", lessonIds.length] }] }, "completed", { $cond: [{ $gt: [{ $add: [{ $size: "$viewed" }, { $size: "$quizzes" }, { $size: "$positions" }] }, 0] }, "in-progress", "not-started"] }] } } },
      { $project: { name: 1, email: 1, createdAt: 1, viewed: 1, quizzes: 1, completedLessons: 1, lastActivity: 1, averageScore: 1, status: 1, needsAttention: 1 } },
      ...(options.status === "needs-attention" ? [{ $match: { needsAttention: true } }] : options.status !== "all" ? [{ $match: { status: options.status } }] : []),
    ];
    const result = await pageAggregate(User, pipeline, options.page);
    return res.json({ ...result, courseTitle: course.courseTitle, totalLessons: lessonIds.length, lectures: course.lectures.map(item => ({ _id: item._id, lectureTitle: item.lectureTitle, hasQuiz: Boolean(item.quizQuestions?.length), passPercentage: item.quizPassPercentage ?? 60 })) });
  } catch (error) { reportError("teaching.students.failed", error); return res.status(500).json({ message: "Could not load student progress." }); }
}

export async function getQuestionInbox(req, res) {
  try {
    const options = filters(req.query, ["all", "open", "resolved"]);
    if (!options || (req.query.courseId && !mongoose.isValidObjectId(req.query.courseId))) return res.status(400).json({ message: "Invalid question filters." });
    if (!["admin", "instructor"].includes(req.user?.role)) return res.status(403).json({ message: "Access denied." });
    const courses = await Course.find({ ...(req.user.role === "admin" ? {} : { creator: req.id }), ...(req.query.courseId ? { _id: req.query.courseId } : {}) }).select("_id").lean();
    const pipeline = [
      { $match: { parentCommentId: null, courseId: { $in: courses.map(item => item._id) }, ...(options.status === "open" ? { resolvedAt: null } : options.status === "resolved" ? { resolvedAt: { $ne: null } } : {}), ...(options.q ? { text: { $regex: escaped(options.q), $options: "i" } } : {}) } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", pipeline: [{ $project: { name: 1, role: 1 } }], as: "student" } },
      { $unwind: "$student" }, { $match: { "student.role": "student" } },
      { $lookup: { from: "courses", localField: "courseId", foreignField: "_id", pipeline: [{ $project: { courseTitle: 1, lectures: 1 } }], as: "course" } }, { $unwind: "$course" },
      { $match: { $expr: { $in: ["$lectureId", "$course.lectures"] } } },
      { $lookup: { from: "lectures", localField: "lectureId", foreignField: "_id", pipeline: [{ $project: { lectureTitle: 1 } }], as: "lecture" } }, { $unwind: "$lecture" },
      { $project: { courseId: 1, lectureId: 1, text: 1, createdAt: 1, resolvedAt: 1, "student.name": 1, "course.courseTitle": 1, "lecture.lectureTitle": 1 } },
    ];
    const result = await pageAggregate(LectureComment, pipeline, options.page);
    const ids = result.rows.map(row => row._id);
    const recent = ids.length ? await LectureComment.aggregate([
      { $match: { _id: { $in: ids } } },
      { $lookup: { from: "lecturecomments", let: { root: "$_id" }, pipeline: [
        { $match: { $expr: { $eq: ["$parentCommentId", "$$root"] } } },
        { $sort: { createdAt: -1, _id: -1 } }, { $limit: 3 },
        { $lookup: { from: "users", localField: "userId", foreignField: "_id", pipeline: [{ $project: { name: 1, role: 1 } }], as: "author" } },
        { $project: { text: 1, createdAt: 1, author: { $first: "$author" } } },
      ], as: "replies" } }, { $project: { replies: 1 } },
    ]) : [];
    return res.json({ ...result, rows: result.rows.map(row => ({ ...row, replies: recent.find(item => String(item._id) === String(row._id))?.replies || [] })) });
  } catch (error) { reportError("teaching.questions.failed", error); return res.status(500).json({ message: "Could not load questions." }); }
}

export async function resolveQuestion(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId) || typeof req.body?.resolved !== "boolean") return res.status(400).json({ message: "Resolved must be a boolean." });
    const course = await Course.findById(req.params.courseId).select("creator lectures").lean();
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!manager(req, course)) return res.status(403).json({ message: "Access denied." });
    const question = await LectureComment.findOneAndUpdate({ _id: req.params.commentId, courseId: course._id, lectureId: { $in: course.lectures }, parentCommentId: null }, { $set: { resolvedAt: req.body.resolved ? new Date() : null, resolvedBy: req.body.resolved ? objectId(req.id) : null } }, { new: true }).select("_id resolvedAt");
    if (!question) return res.status(404).json({ message: "Question not found." });
    return res.json({ question });
  } catch (error) { reportError("teaching.resolve.failed", error); return res.status(500).json({ message: "Could not update question." }); }
}
