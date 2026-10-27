import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lectureId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecture", required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    attemptsCount: { type: Number, default: 1 },
    bestScore: { type: Number, default: 0 },
    bestPercentage: { type: Number, default: 0 },
    history: { type: [quizAttemptSchema], default: [] },
  },
  { timestamps: true }
);

// One result per student per lecture (upsert on re-attempt)
quizResultSchema.index({ userId: 1, lectureId: 1 }, { unique: true });
quizResultSchema.index({ courseId: 1, updatedAt: -1 });
quizResultSchema.index({ courseId: 1, lectureId: 1, updatedAt: -1 });

export const QuizResult = mongoose.model("QuizResult", quizResultSchema);
