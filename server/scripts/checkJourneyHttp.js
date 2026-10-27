// Exercise the real HTTP middleware on the isolated browser-QA server only.
import assert from "node:assert/strict";
const origin = "http://localhost:8088";
const approved = process.argv.includes("--approved");
let checks = 0;
async function request(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${origin}/api/v1/${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  return { status: res.status, body: await res.json() };
}
async function login(email) {
  const response = await request("user/login", { method: "POST", body: { email, password: "Local-QA-2026!" } });
  assert.equal(response.status, 200, "Test-account login must succeed.");
  assert.equal(response.body.user.email, email);
  assert.ok(response.body.token);
  return response.body.token;
}
const student = await login("qa-student@example.test");
const admin = await login("qa-admin@example.test");
const other = await login("qa-other@example.test");
const courses = await request("course/published-courses");
const course = courses.body.courses.find((item) => item.courseTitle === "QA Physics — browser journey");
assert.ok(course, "Publish the isolated QA course first.");
const id = course._id;
assert.equal((await request(`progress/${id}`)).status, 401); checks++;
assert.equal((await request("user/admin/users", { token: student })).status, 403); checks++;
assert.equal((await request("purchase/manual-orders", { token: student })).status, 403); checks++;
assert.equal((await request(`course/${id}`, { token: other, method: "PUT", body: { courseTitle: "Unauthorized edit must not happen" } })).status, 403); checks++;
const progress = await request(`progress/${id}`, { token: student });
assert.equal(progress.status, approved ? 200 : 403); checks++;
const detail = await request(`purchase/course/${id}/detail-with-status`, { token: student });
assert.equal(detail.body.hasAccess, approved); checks++;
if (approved) {
  assert.ok(detail.body.course.lectures.some((lecture) => lecture.videoUrl)); checks++;
} else {
  assert.ok(detail.body.course.lectures.every((lecture) => !lecture.videoUrl && !lecture.attachmentUrl)); checks++;
}
const allOrders = await request("purchase/manual-orders", { token: admin });
const order = allOrders.body.orders.find((item) => item.course?._id === id && item.student?.email === "qa-student@example.test");
assert.ok(order, "Create the QA student's order from the browser first.");
assert.equal((await request(`purchase/manual-orders/${order._id}`, { token: admin, method: "PATCH", body: { decision: "approve" } })).status, 403); checks++;
console.log(`${checks} real HTTP checks passed (${approved ? "approved" : "pending"} order). No payment was transferred or WhatsApp message sent.`);
