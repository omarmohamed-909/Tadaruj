import mongoose from "mongoose";

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  origin: { type: String, required: true },
  clientId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const GoogleLoginAttempt = mongoose.model("GoogleLoginAttempt", schema);
