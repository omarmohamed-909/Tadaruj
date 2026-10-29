import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lectureId: { type: mongoose.Schema.Types.ObjectId, required: true },
  position: { type: Number, min: 0, required: true },
  duration: { type: Number, min: 0, required: true },
}, { timestamps: true });
schema.index({ userId: 1, courseId: 1, lectureId: 1 }, { unique: true });
schema.index({ userId: 1, updatedAt: -1 });
export const LearningPosition = mongoose.model("LearningPosition", schema);
