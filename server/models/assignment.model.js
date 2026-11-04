import mongoose from "mongoose";
const schema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  title: { type: String, required: true, maxlength: 160 },
  instructions: { type: String, required: true, maxlength: 10000 },
  maxScore: { type: Number, required: true, min: 1, max: 1000 },
  dueAt: { type: Date, default: null },
  published: { type: Boolean, default: false },
  closed: { type: Boolean, default: false },
  revision: { type: Number, default: 0 },
  submissionCount: { type: Number, default: 0 },
  submissionRevision: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ courseId: 1, published: 1, createdAt: -1, _id: -1 });
export const Assignment = mongoose.model("Assignment", schema);
const attempt = new mongoose.Schema({
  text: String, resourceUrl: String, submittedAt: Date, dueAt: Date, late: Boolean,
  score: { type: Number, default: null }, feedback: { type: String, default: "" },
  reviewedAt: Date, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  decision: { type: String, enum: ["graded", "returned"] },
}, { _id: false });
const submission = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["submitted", "returned", "graded"], default: "submitted" },
  score: { type: Number, default: null }, feedback: { type: String, default: "" },
  submittedAt: Date, late: Boolean, revision: { type: Number, default: 1 },
  attemptCount: { type: Number, default: 1 }, attempts: { type: [attempt], default: [] },
}, { timestamps: true });
submission.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submission.index({ assignmentId: 1, status: 1, submittedAt: -1, _id: -1 });
submission.index({ courseId: 1 });
export const AssignmentSubmission = mongoose.model("AssignmentSubmission", submission);
