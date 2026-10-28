import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { once } from "node:events";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { readAdminUserFilters } from "../utils/adminUsers.js";
import { readAdminCourseFilters } from "../utils/adminCourses.js";

describe("admin user query validation", () => {
  it.each([{ page: "0" }, { limit: "-1" }, { page: "1.5" }, { page: ["1", "2"] }, { q: { $ne: null } }, { q: "x".repeat(101) }, { role: "owner" }, { status: "deleted" }])("rejects malformed filters %j", query => {
    expect(readAdminUserFilters(query)).toBeNull();
  });
});
describe("admin course access query validation", () => {
  it.each([{ page: "0" }, { limit: "0" }, { q: { $ne: null } }, { userId: "invalid" }, { userId: ["one", "two"] }, { userId: "" }, { status: "hidden" }, { access: "owner" }, { q: "x".repeat(101) }])("rejects malformed filters %j", query => {
    expect(readAdminCourseFilters({ userId: "507f1f77bcf86cd799439012", ...query })).toBeNull();
  });
});
const uri = process.env.TEST_ADMIN_MONGO_URI;
describe.skipIf(!uri)("admin user listing with isolated real MongoDB", () => {
  let server, base, admin, members, accessCourses;
  const token = user => jwt.sign({ userId: String(user._id), purpose: "access" }, process.env.SECRET_KEY);
  const get = (query = "", actor = admin) => fetch(`${base}/api/v1/user/admin/users${query ? `?${query}` : ""}`, { headers: actor ? { Authorization: `Bearer ${token(actor)}` } : {} });
  const body = async (query, actor) => { const response = await get(query, actor); expect(response.status).toBe(200); return response.json(); };
  beforeAll(async () => {
    if (!/^mongodb:\/\/127\.0\.0\.1:27028\/tadaruj_test_[a-f0-9]+\?replicaSet=codex-test$/.test(uri)) throw new Error("Use a new isolated admin test database.");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    if ((await mongoose.connection.db.listCollections().toArray()).length) throw new Error("The admin test database must be empty.");
    vi.stubEnv("SECRET_KEY", "isolated-admin-listing-test-secret");
    await User.init();
    admin = await User.create({ name: "Platform Admin", email: "admin@example.test", password: "private-password", role: "admin", createdAt: new Date("2024-01-01") });
    members = await User.insertMany(Array.from({ length: 51 }, (_, index) => ({ name: index === 0 ? ".* Literal Person" : `Member ${String(index).padStart(2, "0")}`, email: `member-${index}@example.test`, password: "private-password", role: index < 40 ? "student" : "instructor", status: index % 4 === 0 ? "suspended" : "active", googleId: `private-google-${index}`, resetPasswordExpires: new Date(), instructorWhatsapp: "+201000000000", createdAt: new Date("2025-01-01") })));
    const course = await Course.create({ courseTitle: "Direct access fixture", subject: "Science", creator: members[50]._id });
    await User.updateOne({ _id: members[1]._id }, { $addToSet: { enrolledCourses: course._id } });
    accessCourses = await Course.insertMany(Array.from({ length: 26 }, (_, index) => ({ courseTitle: index === 0 ? ".* Access fixture" : `Access Course ${String(index).padStart(2, "0")}`, subject: "Science", creator: members[index < 20 ? 50 : 49]._id, isPublished: index % 3 !== 0, createdAt: new Date("2025-01-01"), description: "private-description", lectures: [new mongoose.Types.ObjectId()], enrolledStudents: [members[1]._id] })));
    await User.updateOne({ _id: members[1]._id }, { $addToSet: { enrolledCourses: { $each: [accessCourses[2]._id, accessCourses[22]._id] } } });
    await User.updateOne({ _id: members[2]._id }, { $addToSet: { enrolledCourses: accessCourses[5]._id } });
    server = createApp({ connectDatabase: async () => {}, logger: () => {} }).listen(0, "127.0.0.1");
    await once(server, "listening"); base = `http://127.0.0.1:${server.address().port}`;
  }, 20000);
  afterAll(async () => {
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await mongoose.disconnect(); vi.unstubAllEnvs();
  });
  it("keeps the list restricted to admins", async () => {
    expect((await get("", null)).status).toBe(401);
    expect((await get("", members[1])).status).toBe(403);
    expect((await get("", members[50])).status).toBe(403);
  });
  it("returns stable bounded pages with a total and excludes private authentication fields", async () => {
    const first = await body("page=1"), second = await body("page=2"), third = await body("page=3");
    expect(first).toMatchObject({ page: 1, limit: 20, total: 52, totalPages: 3 });
    expect([first.users.length, second.users.length, third.users.length]).toEqual([20, 20, 12]);
    expect(new Set([...first.users, ...second.users, ...third.users].map(user => user._id)).size).toBe(52);
    expect((await body("page=1")).users.map(user => user._id)).toEqual(first.users.map(user => user._id));
    for (const user of [...first.users, ...second.users, ...third.users]) {
      expect(user.password).toBeUndefined(); expect(user.googleId).toBeUndefined();
      expect(user.resetPasswordExpires).toBeUndefined(); expect(user.instructorWhatsapp).toBeUndefined();
    }
  });
  it("searches the complete user set, escapes regex text, and combines role/status filters", async () => {
    expect((await body("q=Member+01")).users[0].email).toBe("member-1@example.test");
    expect((await body("q=.%2A")).users.map(user => user.name)).toEqual([".* Literal Person"]);
    const filtered = await body("role=student&status=suspended");
    expect(filtered.total).toBe(10);
    expect(filtered.users.every(user => user.role === "student" && user.status === "suspended")).toBe(true);
    const grants = await body("q=member-1%40example.test");
    expect(grants.users[0].enrolledCourses[0].courseTitle).toBe("Direct access fixture");
  });
  it("caps the page size and rejects malformed HTTP query values", async () => {
    expect((await body("limit=999999")).users).toHaveLength(50);
    for (const query of ["page=0", "q=one&q=two", "status=unknown", "role=owner"]) expect((await get(query)).status).toBe(400);
  });
  it("recovers a removed last page and represents an empty result as page one", async () => {
    const targets = await User.create([0, 1].map(index => ({ name: "Recovery target", email: `recovery-${index}@example.test`, password: "private-password" })));
    expect((await body("q=Recovery+target&limit=1&page=2")).page).toBe(2);
    await User.deleteOne({ _id: targets[0]._id });
    expect(await body("q=Recovery+target&limit=1&page=2")).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    expect(await body("q=No+matching+member&page=999")).toMatchObject({ page: 1, total: 0, totalPages: 0, users: [] });
  });
  it("includes older accounts without a stored status in the active filter", async () => {
    await User.collection.insertOne({ name: "Legacy active member", email: "legacy-active@example.test", password: "private-password", role: "student", createdAt: new Date() });
    const result = await body("q=Legacy+active&status=active");
    expect(result.total).toBe(1);
    expect(result.users[0].status).toBe("active");
  });

  const courseResponse = (query = "", actor = admin) => fetch(`${base}/api/v1/course/admin/course-access?${query}`, { headers: actor ? { Authorization: `Bearer ${token(actor)}` } : {} });
  const coursePage = async (query = "", user = members[1]) => {
    const response = await courseResponse(`userId=${user._id}&${query}`);
    expect(response.status).toBe(200); return response.json();
  };
  const changeAccess = (user, course, action, actor = admin) => fetch(`${base}/api/v1/user/admin/users/${user._id}/course-access`, { method: "PATCH", headers: { Authorization: `Bearer ${token(actor)}`, "Content-Type": "application/json" }, body: JSON.stringify({ courseId: String(course._id), action }) });
  it("restricts the course access catalog to admins", async () => {
    expect((await courseResponse("", null)).status).toBe(401);
    expect((await courseResponse("", members[1])).status).toBe(403);
    expect((await courseResponse("", members[50])).status).toBe(403);
  });
  it("preserves the existing catalog used by dashboard and course-management screens", async () => {
    const response = await fetch(`${base}/api/v1/course/admin/manageable-courses`, { headers: { Authorization: `Bearer ${token(admin)}` } });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.courses).toHaveLength(27);
    expect(result.courses[0].creator.email).toBeDefined();
  });
  it("returns stable bounded course pages with grants first and minimal data", async () => {
    const first = await coursePage(), second = await coursePage("page=2"), third = await coursePage("page=3");
    expect(first).toMatchObject({ page: 1, limit: 12, total: 27, totalPages: 3, grantedTotal: 3 });
    expect([first.courses.length, second.courses.length, third.courses.length]).toEqual([12, 12, 3]);
    expect(new Set([...first.courses, ...second.courses, ...third.courses].map(course => course._id)).size).toBe(27);
    expect(first.courses.slice(0, 3).every(course => course.hasDirectAccess)).toBe(true);
    expect(first.courses.slice(3).every(course => !course.hasDirectAccess)).toBe(true);
    expect((await coursePage()).courses.map(course => course._id)).toEqual(first.courses.map(course => course._id));
    for (const course of first.courses) {
      expect(course.description).toBeUndefined(); expect(course.lectures).toBeUndefined(); expect(course.enrolledStudents).toBeUndefined();
      expect(course.creator.email).toBeUndefined(); expect(course.creator.password).toBeUndefined();
    }
  });
  it("searches all titles and instructor names, treats regex text literally and combines filters", async () => {
    const title = await coursePage("q=Access+Course+02");
    expect(title.total).toBe(1); expect(title.courses[0].hasDirectAccess).toBe(true);
    expect(title.grantedTotal).toBe(3);
    const creator = await coursePage("q=Member+50&page=2");
    expect(creator.total).toBe(21); expect(creator.courses.every(course => course.creator.name === "Member 50")).toBe(true);
    expect((await coursePage("q=.%2A")).courses.map(course => course.courseTitle)).toEqual([".* Access fixture"]);
    const granted = await coursePage("access=granted&status=published");
    expect(granted.total).toBe(2); expect(granted.courses.every(course => course.hasDirectAccess && course.isPublished)).toBe(true);
    const available = await coursePage("access=available&status=draft");
    expect(available.total).toBe(9); expect(available.courses.every(course => !course.hasDirectAccess && !course.isPublished)).toBe(true);
  });
  it("keeps access independent for different target users and handles missing targets", async () => {
    expect((await coursePage("q=Access+Course+02", members[1])).courses[0].hasDirectAccess).toBe(true);
    expect((await coursePage("q=Access+Course+02", members[2])).courses[0].hasDirectAccess).toBe(false);
    expect((await courseResponse(`userId=${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    for (const query of ["userId=invalid", "q=one&q=two", "page=0", "access=unknown"]) expect((await courseResponse(query)).status).toBe(400);
    expect((await coursePage("limit=999999")).courses).toHaveLength(24);
    expect(await coursePage("page=999")).toMatchObject({ page: 3, totalPages: 3 });
    expect(await coursePage("q=Nonexistent+course&page=9")).toMatchObject({ page: 1, totalPages: 0, total: 0, courses: [] });
  });
  it("reflects a grant and revoke without treating another user's enrollment as access", async () => {
    const target = members[3], course = accessCourses[9];
    expect((await coursePage("q=Access+Course+09", target)).courses[0].hasDirectAccess).toBe(false);
    expect((await changeAccess(target, course, "grant")).status).toBe(200);
    expect(await coursePage("q=Access+Course+09", target)).toMatchObject({ grantedTotal: 1, courses: [expect.objectContaining({ hasDirectAccess: true })] });
    expect(await coursePage("q=Access+Course+09&access=available&page=2", target)).toMatchObject({ page: 1, total: 0 });
    expect((await changeAccess(target, course, "revoke")).status).toBe(200);
    expect((await coursePage("q=Access+Course+09", target)).courses[0].hasDirectAccess).toBe(false);
  });
  it("preserves the paid-purchase restriction when revoking access", async () => {
    const target = members[4], course = accessCourses[8];
    expect((await changeAccess(target, course, "grant")).status).toBe(200);
    await CoursePurchase.create({ userId: target._id, courseId: course._id, amount: 250, status: "completed", paymentMethod: "manual", paymentId: "synthetic-course-access-payment", instructorId: course.creator });
    expect((await changeAccess(target, course, "revoke")).status).toBe(400);
    expect((await coursePage("q=Access+Course+08", target)).courses[0].hasDirectAccess).toBe(true);
  });
});
