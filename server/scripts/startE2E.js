// Local browser-test harness only. No production credentials, messages, or real payments.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import http from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";

if (process.env.NODE_ENV !== "test" || process.env.TADARUJ_E2E !== "1") throw new Error("Run through the local Playwright configuration only.");
const database = `tadaruj_test_${new mongoose.Types.ObjectId()}`;
const directory = fileURLToPath(new URL("../../.test-runtime/", import.meta.url));
await mkdir(directory, { recursive: true });
Object.assign(process.env, {
  MONGO_URI: `mongodb://127.0.0.1:27028/${database}?replicaSet=codex-test`,
  PORT: "8093", SERVER_HOST: "127.0.0.1", FRONTEND_URL: "http://127.0.0.1:5193",
  FRONTEND_URLS: "http://127.0.0.1:5193", SECRET_KEY: "local-e2e-session-signing-key-not-for-production",
  EMAIL_DELIVERY_ENABLED: "false", ALLOW_DEV_VERIFICATION_LINKS: "true", ALLOW_DEV_RESET_LINKS: "false",
  GOOGLE_CLIENT_ID: "", RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", CLOUDINARY_URL: "",
  CLOUDINARY_CLOUD_NAME: "", CLOUDINARY_API_KEY: "", CLOUDINARY_API_SECRET: "",
  CLOUD_NAME: "", API_KEY: "", API_SECRET: "", STRIPE_SECRET_KEY: "", WEBHOOK_ENDPOINT_SECRET: "",
});
const probe = await mongoose.createConnection(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
try {
  if ((await probe.db.listCollections().toArray()).length) throw new Error("E2E database must be new and empty.");
} finally { await probe.close(); }
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
const password = "Local-E2E-password-2026!";
const instructor = await User.create({ name: "E2E Instructor", email: "e2e-instructor@example.test", password: await bcrypt.hash(password, 10), role: "instructor", emailVerified: true, instructorWhatsapp: "+201000000000", instructorSubjects: ["Science"] });
const admin = await User.create({ name: "E2E Admin", email: "e2e-admin@example.test", password: instructor.password, role: "admin", emailVerified: true });
const members = await User.insertMany(Array.from({ length: 25 }, (_, index) => ({ name: `E2E Member ${String(index).padStart(2, "0")}`, email: `e2e-member-${index}@example.test`, password: instructor.password, role: "student", emailVerified: true, status: index % 5 === 0 ? "suspended" : "active", createdAt: new Date("2025-01-01") })));
const lecture = await Lecture.create({ lectureTitle: "E2E playback lesson", videoUrl: "http://127.0.0.1:8094/lesson.webm", description: "A synthetic two-second test video." });
const courses = await Course.insertMany(Array.from({ length: 26 }, (_, index) => ({
  courseTitle: index === 0 ? "E2E Physics Journey" : `E2E Course ${String(index).padStart(2, "0")}`,
  creator: instructor._id, isPublished: true, subject: "Science", gradeLevel: "Grade 1",
  coursePrice: 250, ...(index === 0 ? { lectures: [lecture._id] } : {}),
})));
await Course.create({ courseTitle: "E2E unpublished draft", creator: instructor._id, subject: "Unreleased", isPublished: false });
const teachingLecture = await Lecture.create({ lectureTitle: "E2E assessment lesson", videoUrl: "http://127.0.0.1:8094/lesson.webm", quizQuestions: [{ questionText: "What is 2 plus 2?", options: ["Four", "Five"], correctOptionIndex: 0 }] });
await Course.updateOne({ _id: courses[24]._id }, { $set: { lectures: [teachingLecture._id] } });
await User.updateOne({ _id: members[23]._id }, { $addToSet: { enrolledCourses: courses[24]._id } });
await writeFile(`${directory}e2e-fixtures.json`, JSON.stringify({ instructorId: String(instructor._id), instructorEmail: instructor.email, adminEmail: admin.email, password, courseId: String(courses[0]._id), lectureId: String(lecture._id), courseCount: 26, curriculumCourseId: String(courses[25]._id), teachingCourseId: String(courses[24]._id), teachingLectureId: String(teachingLecture._id), teachingStudentEmail: members[23].email }));

// A deterministic local stand-in for the external media provider, not an API bypass.
const media = http.createServer(async (req, res) => {
  if (req.url !== "/lesson.webm") { res.writeHead(404).end(); return; }
  try {
    const file = `${directory}e2e-clip.webm`;
    const { size } = await stat(file);
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { "Content-Range": `bytes */${size}` }).end(); return; }
    res.writeHead(range ? 206 : 200, { "Content-Type": "video/webm", "Accept-Ranges": "bytes", "Content-Length": end - start + 1, ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}) });
    createReadStream(file, { start, end }).pipe(res);
  } catch { res.writeHead(503).end(); }
});
media.listen(8094, "127.0.0.1");
console.log(`E2E uses a fresh isolated database: ${database}. Email and Google are disabled.`);
await import("../index.js");
