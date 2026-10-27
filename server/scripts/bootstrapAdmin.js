import "dotenv/config";
import connectDB from "../database/db.js";
import { User } from "../models/user.model.js";
import { AuditLog } from "../models/auditLog.model.js";

const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
if (!email || !process.env.BOOTSTRAP_ADMIN_SECRET || process.env.BOOTSTRAP_ADMIN_SECRET.length < 24) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and a random BOOTSTRAP_ADMIN_SECRET of at least 24 characters.");
}

await connectDB();
if (await User.exists({ role: "admin" })) throw new Error("An admin already exists; use an invitation instead.");
const user = await User.findOne({ email });
if (!user) throw new Error("Create and verify this account before bootstrapping admin access.");
if (!user.emailVerified) throw new Error("The bootstrap account must have a verified email.");
user.role = "admin";
await user.save();
await AuditLog.create({ actor: user._id, action: "admin.bootstrap", targetType: "User", targetId: user._id.toString() });
console.log(`Admin access enabled for ${email}. Remove bootstrap environment variables now.`);
process.exit(0);
