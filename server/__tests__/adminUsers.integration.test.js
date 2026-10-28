import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { once } from "node:events";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { readAdminUserFilters } from "../utils/adminUsers.js";

describe("admin user query validation", () => {
  it.each([{ page: "0" }, { limit: "-1" }, { page: "1.5" }, { page: ["1", "2"] }, { q: { $ne: null } }, { q: "x".repeat(101) }, { role: "owner" }, { status: "deleted" }])("rejects malformed filters %j", query => {
    expect(readAdminUserFilters(query)).toBeNull();
  });
});
const uri = process.env.TEST_ADMIN_MONGO_URI;
describe.skipIf(!uri)("admin user listing with isolated real MongoDB", () => {
  let server, base, admin, members;
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
});
