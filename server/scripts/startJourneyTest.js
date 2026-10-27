// A separate, disposable local environment for browser QA. Never uses MONGO_URI.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";

const testDatabase = process.env.TEST_JOURNEY_DB_NAME || `tadaruj_test_${new mongoose.Types.ObjectId()}`;
if (!/^tadaruj_test_[a-f0-9]{24}$/.test(testDatabase)) throw new Error("Only a named local test database may be used.");
const testUri = `mongodb://127.0.0.1:27028/${testDatabase}?replicaSet=codex-test`;
Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "8088",
  SERVER_HOST: "127.0.0.1",
  MONGO_URI: testUri,
  SECRET_KEY: "local-browser-qa-only-not-for-production-20261026",
  FRONTEND_URL: "http://localhost:5188",
  FRONTEND_URLS: "http://localhost:5188",
  ALLOW_DEV_VERIFICATION_LINKS: "true",
  ALLOW_DEV_RESET_LINKS: "true",
  EMAIL_DELIVERY_ENABLED: process.env.TEST_ALLOW_REAL_EMAIL === "true" ? "true" : "false",
});
await mongoose.connect(testUri, { serverSelectionTimeoutMS: 10000 });
await User.init();
const password = await bcrypt.hash("Local-QA-2026!", 10);
const fixtures = [
  { name: "QA Instructor", email: "qa-instructor@example.test", password, role: "instructor", emailVerified: true, instructorWhatsapp: "+201000000000", instructorBio: "Isolated test account. Not a real teacher.", instructorSubjects: ["Physics"] },
  { name: "QA Other Instructor", email: "qa-other@example.test", password, role: "instructor", emailVerified: true },
  { name: "QA Admin", email: "qa-admin@example.test", password, role: "admin", emailVerified: true },
];
for (const fixture of fixtures) {
  if (!await User.exists({ email: fixture.email })) await User.create(fixture);
}
console.log(`Isolated QA database: ${testDatabase}`);
console.log("Test accounts: qa-instructor@example.test / qa-other@example.test / qa-admin@example.test");
console.log("Test-only password: Local-QA-2026!");
console.log(process.env.EMAIL_DELIVERY_ENABLED === "true" ? "Real email explicitly enabled; resend.dev is restricted to RESEND_TEST_RECIPIENT." : "Email is disabled in browser QA. No WhatsApp messages should be sent to the placeholder number.");
await import("../index.js");
