import mongoose from "mongoose";

const adminInvitationSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
}, { timestamps: true });

export const AdminInvitation = mongoose.model("AdminInvitation", adminInvitationSchema);
