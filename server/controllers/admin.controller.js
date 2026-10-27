import crypto from "node:crypto";
import { AdminInvitation } from "../models/adminInvitation.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/sendEmail.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const createAdminInvitation = async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "A valid email is required." });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Ask this person to register first." });
        if (user.status === "suspended") return res.status(403).json({ success: false, message: "Suspended users cannot be invited." });
        if (user.emailVerified !== true) return res.status(403).json({ success: false, message: "This user must verify their email before receiving an admin invitation." });
        if (user.role === "admin") return res.status(409).json({ success: false, message: "This user is already an admin." });

        const token = crypto.randomBytes(32).toString("hex");
        const invitation = await AdminInvitation.create({
            email,
            tokenHash: hashToken(token),
            invitedBy: req.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
        const inviteUrl = `${frontendUrl}/admin/invite/${token}`;
        let emailSent = false;
        try {
            const result = await sendEmail({
                to: email,
                subject: "Tadaruj admin invitation",
                text: `Sign in with ${email}, then accept your admin invitation: ${inviteUrl}\nThis link expires in 24 hours.`,
                html: `<p>Sign in with your invited email, then <a href="${inviteUrl}">accept your admin invitation</a>.</p><p>This link expires in 24 hours.</p>`,
            });
            emailSent = Boolean(result?.sent);
        } catch (error) {
            console.error("Admin invitation email failed:", error);
        }
        if (!emailSent && process.env.NODE_ENV === "production") {
            await AdminInvitation.findByIdAndDelete(invitation._id);
            return res.status(503).json({ success: false, message: "Email delivery is unavailable. Configure Resend before sending admin invitations." });
        }
        await AuditLog.create({ actor: req.id, action: "admin.invitation.created", targetType: "AdminInvitation", targetId: invitation._id.toString(), metadata: { email, emailSent }, ip: req.ip });
        return res.status(201).json({ success: true, message: emailSent ? "Invitation sent." : "Invitation created, but email delivery failed.", emailSent, ...(!emailSent && process.env.NODE_ENV !== "production" ? { inviteUrl } : {}) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Could not create invitation." });
    }
};

export const acceptAdminInvitation = async (req, res) => {
    try {
        const invitation = await AdminInvitation.findOne({ tokenHash: hashToken(String(req.params.token || "")), acceptedAt: null, expiresAt: { $gt: new Date() } });
        if (!invitation) return res.status(400).json({ success: false, message: "Invitation is invalid or expired." });
        if (req.user.email.toLowerCase() !== invitation.email) return res.status(403).json({ success: false, message: "Sign in with the invited email." });
        // Atomic claim makes replay of the same invitation fail.
        const claimed = await AdminInvitation.findOneAndUpdate(
            { _id: invitation._id, acceptedAt: null, expiresAt: { $gt: new Date() } },
            { $set: { acceptedAt: new Date() } },
            { new: true }
        );
        if (!claimed) return res.status(409).json({ success: false, message: "Invitation was already used." });
        let user;
        try {
            user = await User.findByIdAndUpdate(req.id, { role: "admin" }, { new: true }).select("-password");
            if (!user) throw new Error("Invited user not found.");
        } catch (error) {
            await AdminInvitation.findByIdAndUpdate(invitation._id, { acceptedAt: null });
            throw error;
        }
        await AuditLog.create({ actor: req.id, action: "admin.invitation.accepted", targetType: "User", targetId: req.id, metadata: { invitationId: invitation._id }, ip: req.ip }).catch((error) => console.error("Audit logging failed:", error));
        return res.status(200).json({ success: true, message: "Admin access enabled.", user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Could not accept invitation." });
    }
};

export const getAuditLogs = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const logs = await AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("actor", "name email");
    return res.json({ success: true, logs, page });
};
