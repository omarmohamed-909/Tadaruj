import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String,
}, { timestamps: true });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
