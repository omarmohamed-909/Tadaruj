import mongoose from "mongoose";
import { Assignment, AssignmentSubmission } from "../models/assignment.model.js";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { reportError } from "../utils/logger.js";

const fail = (status, code) => { throw Object.assign(new Error(code), { status, code }); };
const validId = value => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
const manager = (req, course) => req.user?.role === "admin" || (req.user?.role === "instructor" && String(course.creator) === req.id);
async function access(req, management = false) {
  if (!validId(req.params.courseId)) fail(400, "INVALID_INPUT");
  const course = await Course.findById(req.params.courseId).select("creator courseTitle coursePrice isPublished").lean();
  if (!course) fail(404, "COURSE_NOT_FOUND");
  if (manager(req, course)) return course;
  if (management) fail(403, "ACCESS_DENIED");
  const [user, purchase] = await Promise.all([
    User.findById(req.id).select("enrolledCourses").lean(),
    CoursePurchase.exists({ courseId: course._id, userId: req.id, status: "completed" }),
  ]);
  if (!purchase && !user?.enrolledCourses?.some(id => String(id) === req.params.courseId) && !(course.isPublished && Number(course.coursePrice || 0) <= 0)) fail(403, "ACCESS_DENIED");
  return course;
}
function definition(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
  const dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (!title || title.length > 160 || !instructions || instructions.length > 10000 || !Number.isInteger(body.maxScore) || body.maxScore < 1 || body.maxScore > 1000 || typeof body.published !== "boolean" || typeof body.closed !== "boolean" || (body.dueAt && (typeof body.dueAt !== "string" || !Number.isFinite(dueAt.getTime())))) fail(400, "INVALID_INPUT");
  return { title, instructions, maxScore: body.maxScore, dueAt, published: body.published, closed: body.closed };
}
function pageNumber(query = {}) {
  if (query.page !== undefined && (typeof query.page !== "string" || !/^[1-9]\d{0,5}$/.test(query.page))) fail(400, "INVALID_INPUT");
  return Number(query.page || 1);
}
const wrap = handler => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    if (!error.status) reportError("assignments.request.failed", error);
    res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ code: error.status ? error.code : error.code === 11000 ? "STALE_SUBMISSION" : "REQUEST_FAILED" });
  }
};
const assignmentFor = async (req, session) => {
  if (!validId(req.params.assignmentId)) fail(400, "INVALID_INPUT");
  const assignment = await Assignment.findOne({ _id: req.params.assignmentId, courseId: req.params.courseId }).session(session || null);
  if (!assignment) fail(404, "ASSIGNMENT_NOT_FOUND");
  return assignment;
};
export const listAssignments = wrap(async (req, res) => {
  const course = await access(req, Boolean(req.assignmentManagement));
  const isManager = req.assignmentManagement && manager(req, course);
  const filter = { courseId: course._id, ...(isManager ? {} : { published: true }) };
  if (req.query?.view === "todo") {
    if (isManager || req.user?.role !== "student") fail(403, "STUDENT_ONLY");
    const lockedIds = await AssignmentSubmission.distinct("assignmentId", {
      courseId: course._id,
      studentId: req.id,
      $or: [{ status: { $ne: "returned" } }, { attemptCount: { $gte: 10 } }],
    });
    filter.closed = false;
    filter._id = { $nin: lockedIds };
  }
  const total = await Assignment.countDocuments(filter), totalPages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(pageNumber(req.query), totalPages);
  const assignments = await Assignment.find(filter).select("title maxScore dueAt published closed revision submissionCount createdAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 12).limit(12).lean();
  const assignmentIds = assignments.map(item => item._id);
  let rows;
  if (isManager) {
    const counts = await AssignmentSubmission.aggregate([
      { $match: { assignmentId: { $in: assignmentIds }, status: "submitted" } },
      { $group: { _id: "$assignmentId", count: { $sum: 1 } } },
    ]);
    const pending = new Map(counts.map(item => [String(item._id), item.count]));
    rows = assignments.map(item => ({
      ...item,
      pendingReviewCount: pending.get(String(item._id)) || 0,
    }));
  } else {
    const submissions = await AssignmentSubmission.find({ assignmentId: { $in: assignmentIds }, studentId: req.id })
      .select("assignmentId status score feedback submittedAt late revision attemptCount").lean();
    rows = assignments.map(item => ({
      ...item,
      submissionCount: undefined,
      submission: submissions.find(submission => String(submission.assignmentId) === String(item._id)) || null,
    }));
  }
  res.json({ courseTitle: course.courseTitle, rows, page, totalPages, total });
});
export const createAssignment = wrap(async (req, res) => {
  await access(req, true);
  const assignment = await Assignment.create({ ...definition(req.body || {}), courseId: req.params.courseId });
  res.status(201).json({ assignment });
});
export const getAssignment = wrap(async (req, res) => {
  const course = await access(req);
  const assignment = await assignmentFor(req);
  const isManager = manager(req, course);
  if (!assignment.published && !isManager) fail(404, "ASSIGNMENT_NOT_FOUND");
  const submission = isManager ? null : await AssignmentSubmission.findOne({ assignmentId: assignment._id, studentId: req.id }).lean();
  const safe = assignment.toObject(); if (!isManager) { delete safe.submissionCount; delete safe.submissionRevision; }
  res.json({ assignment: safe, submission, courseTitle: course.courseTitle, isManager });
});
export const updateAssignment = wrap(async (req, res) => {
  await access(req, true); const values = definition(req.body || {});
  let saved;
  await mongoose.connection.transaction(async session => {
    const assignment = await assignmentFor(req, session);
    if (req.body.revision !== assignment.revision) fail(409, "STALE_ASSIGNMENT");
    if (assignment.submissionCount > 0 && (values.title !== assignment.title || values.instructions !== assignment.instructions || values.maxScore !== assignment.maxScore || !values.published)) fail(409, "ASSIGNMENT_LOCKED");
    saved = await Assignment.findOneAndUpdate({ _id: assignment._id, revision: assignment.revision }, { $set: values, $inc: { revision: 1 } }, { new: true, runValidators: true, session });
    if (!saved) fail(409, "STALE_ASSIGNMENT");
  });
  res.json({ assignment: saved });
});
export const submitAssignment = wrap(async (req, res) => {
  await access(req);
  if (req.user?.role !== "student") fail(403, "STUDENT_ONLY");
  const body = req.body || {}, text = typeof body.text === "string" ? body.text.trim() : "", resourceUrl = typeof body.resourceUrl === "string" ? body.resourceUrl.trim() : "";
  if ((!text && !resourceUrl) || text.length > 15000 || resourceUrl.length > 2000 || !Number.isSafeInteger(body.revision) || body.revision < 0) fail(400, "INVALID_INPUT");
  if (resourceUrl) { let url; try { url = new URL(resourceUrl); } catch { fail(400, "INVALID_LINK"); } if (url.protocol !== "https:" || url.username || url.password) fail(400, "INVALID_LINK"); }
  let saved;
  await mongoose.connection.transaction(async session => {
    const assignment = await assignmentFor(req, session);
    if (!assignment.published || assignment.closed) fail(409, "ASSIGNMENT_CLOSED");
    const existing = await AssignmentSubmission.findOne({ assignmentId: assignment._id, studentId: req.id }).session(session);
    if ((existing?.revision || 0) !== body.revision) fail(409, "STALE_SUBMISSION");
    if (existing && existing.status !== "returned") fail(409, "SUBMISSION_LOCKED");
    if (existing?.attemptCount >= 10) fail(409, "ATTEMPT_LIMIT");
    // Serialize submission with publication, closure and rubric edits.
    await Assignment.updateOne({ _id: assignment._id }, { $inc: { submissionRevision: 1, submissionCount: existing ? 0 : 1 } }, { session });
    const now = new Date(), attempt = { text, resourceUrl, submittedAt: now, dueAt: assignment.dueAt, late: Boolean(assignment.dueAt && now > assignment.dueAt) };
    if (!existing) { [saved] = await AssignmentSubmission.create([{ assignmentId: assignment._id, courseId: assignment.courseId, studentId: req.id, submittedAt: now, late: attempt.late, attempts: [attempt] }], { session }); }
    else { saved = await AssignmentSubmission.findOneAndUpdate({ _id: existing._id, revision: body.revision, status: "returned" }, { $set: { status: "submitted", score: null, feedback: "", submittedAt: now, late: attempt.late }, $inc: { revision: 1, attemptCount: 1 }, $push: { attempts: attempt } }, { new: true, session }); if (!saved) fail(409, "STALE_SUBMISSION"); }
  });
  res.json({ submission: saved });
});
export const listSubmissions = wrap(async (req, res) => {
  await access(req, true); const assignment = await assignmentFor(req);
  const status = req.query.status || "all";
  if (!["all", "submitted", "returned", "graded"].includes(status)) fail(400, "INVALID_INPUT");
  const filter = { assignmentId: assignment._id, ...(status === "all" ? {} : { status }) };
  const total = await AssignmentSubmission.countDocuments(filter), totalPages = Math.max(1, Math.ceil(total / 12)), page = Math.min(pageNumber(req.query), totalPages);
  const rows = await AssignmentSubmission.find(filter).select("studentId status score feedback submittedAt late revision attemptCount").populate("studentId", "name email").sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * 12).limit(12).lean();
  res.json({ rows, page, totalPages, total });
});
export const getSubmission = wrap(async (req, res) => {
  await access(req, true); await assignmentFor(req);
  if (!validId(req.params.submissionId)) fail(400, "INVALID_INPUT");
  const submission = await AssignmentSubmission.findOne({ _id: req.params.submissionId, assignmentId: req.params.assignmentId, courseId: req.params.courseId }).populate("studentId", "name email").lean();
  if (!submission) fail(404, "SUBMISSION_NOT_FOUND");
  res.json({ submission });
});
export const reviewSubmission = wrap(async (req, res) => {
  const course = await access(req, true), assignment = await assignmentFor(req);
  const { decision, score, revision } = req.body || {}, feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";
  if (!validId(req.params.submissionId) || !["graded", "returned"].includes(decision) || !Number.isSafeInteger(revision) || revision < 1 || feedback.length > 3000 || (decision === "returned" && !feedback) || (decision === "graded" && (!Number.isInteger(score) || score < 0 || score > assignment.maxScore))) fail(400, "INVALID_INPUT");
  const current = await AssignmentSubmission.findOne({ _id: req.params.submissionId, assignmentId: assignment._id, courseId: course._id }).lean();
  if (!current) fail(404, "SUBMISSION_NOT_FOUND");
  if (decision === "returned" && current.attemptCount >= 10) fail(409, "ATTEMPT_LIMIT");
  const review = { score: decision === "graded" ? score : null, feedback, reviewedAt: new Date(), reviewedBy: req.id, decision };
  const saved = await AssignmentSubmission.findOneAndUpdate({ _id: current._id, revision, status: "submitted" }, { $set: { status: decision, score: review.score, feedback, ...Object.fromEntries(Object.entries(review).map(([key, value]) => [`attempts.${current.attemptCount - 1}.${key}`, value])) }, $inc: { revision: 1 } }, { new: true });
  if (!saved) fail(409, "STALE_SUBMISSION");
  await Notification.create({ userId: saved.studentId, type: "assignment-review", message: decision === "graded" ? "Your assignment has been graded." : "Your assignment needs a new submission.", link: `/course-assignments/${course._id}/${assignment._id}` }).catch(error => reportError("assignment.notification.failed", error));
  res.json({ submission: saved });
});
