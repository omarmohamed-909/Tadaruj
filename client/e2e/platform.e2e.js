import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const fixtures = async () => JSON.parse(await readFile(new URL("../../.test-runtime/e2e-fixtures.json", import.meta.url), "utf8"));
const api = "http://127.0.0.1:8093/api/v1";

async function isolate(context) {
  await context.addInitScript(() => {
    try { localStorage.setItem("tadaruj_language", "en"); localStorage.setItem("vite-ui-theme", "light"); } catch { /* No storage on about:blank. */ }
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && !["127.0.0.1", "localhost"].includes(url.hostname)) {
      if (["wa.me", "web.whatsapp.com", "api.whatsapp.com"].includes(url.hostname)) {
        return route.fulfill({ status: 200, contentType: "text/html", body: "<p>WhatsApp is blocked in this automated test. No message was sent.</p>" });
      }
      return route.abort();
    }
    return route.continue();
  });
}
test.beforeEach(async ({ context }) => { await isolate(context); });

async function login(page, email, password) {
  await page.goto("/login?mode=login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("tabpanel", { name: "Log in", exact: true }).getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5193/");
}

test("live API exposes bounded health probes and correlated JSON errors", async ({ request }) => {
  const origin = "http://127.0.0.1:8093";
  const live = await request.get(`${origin}/health/live`);
  expect(live.status()).toBe(200);
  expect(await live.json()).toEqual({ status: "alive" });
  const ready = await request.get(`${origin}/health/ready`);
  expect(ready.status()).toBe(200);
  expect(ready.headers()["cache-control"]).toBe("no-store");
  const missing = await request.get(`${origin}/missing?token=synthetic-private-value`);
  expect(missing.status()).toBe(404);
  expect(await missing.json()).toEqual({ success: false, message: "Not found.", requestId: missing.headers()["x-request-id"] });
});

test("catalog, search filters, and public instructor courses retain their pages", async ({ page }) => {
  const fixture = await fixtures();
  await page.goto("/courses");
  await expect(page.getByText("26 published courses", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();

  await page.goto(`/instructors/${fixture.instructorId}?page=2`);
  await expect(page.getByText("26 courses", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(2);
  await page.goBack();
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(12);

  await page.goto("/course/search?subjects=Science&grades=Grade+1&sortByPrice=low&page=2");
  await expect(page.getByRole("checkbox", { name: "Science", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/subjects=Science&grades=Grade\+1&sortByPrice=low&page=3/);
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page).not.toHaveURL(/page=|subjects=|grades=|sortByPrice=/);
  await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(12);
});

test("instructor uploads a 6 MB PDF directly and saves only its asset ID", async ({ page, context }) => {
  const fixture = await fixtures();
  await login(page, fixture.instructorEmail, fixture.password);
  const publicId = `lms/lecture-attachments/${fixture.instructorId}/06360d51-8883-4d12-97df-18e2af5da979.pdf`;
  await context.route(`${api}/media/upload-signature`, (route) => route.fulfill({ json: { data: { cloudName: "e2e", apiKey: "public-test-key", signature: "test-signature", resourceType: "raw", params: { public_id: publicId, type: "authenticated", overwrite: false, timestamp: 123 } } } }));
  let storageBytes = 0;
  await context.route("https://api.cloudinary.com/v1_1/e2e/raw/upload", async (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    storageBytes = route.request().postDataBuffer().length;
    await route.fulfill({ json: { public_id: publicId } });
  });
  let savedPayload;
  await context.route(`${api}/course/${fixture.courseId}/lecture/${fixture.lectureId}`, async (route) => {
    savedPayload = route.request().postData();
    await route.fulfill({ json: { message: "Lecture updated successfully." } });
  });
  await page.goto(`/instructor/course/${fixture.courseId}/lecture/${fixture.lectureId}`);
  // The fixture's playback URL is local; use a valid external video link for this edit.
  await page.getByPlaceholder(/youtube.com/).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles({ name: "large-notes.pdf", mimeType: "application/pdf", buffer: Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(6 * 1024 * 1024)]) });
  await page.getByRole("button", { name: "Update Lecture", exact: true }).click();
  await expect(page.getByText("Lecture updated successfully.", { exact: true })).toBeVisible();
  expect(storageBytes).toBeGreaterThan(6 * 1024 * 1024);
  expect(Buffer.byteLength(savedPayload)).toBeLessThan(8192);
  expect(savedPayload).toContain('name="attachmentAssetId"');
  expect(savedPayload).toContain(publicId);
  expect(savedPayload).not.toContain('filename="large-notes.pdf"');
});

test("student registers, verifies, requests enrollment, receives instructor approval, and saves real playback progress", async ({ page, browser, context }) => {
  const fixture = await fixtures();
  const email = `e2e-student-${Date.now()}@example.test`;
  await page.goto("/login?mode=signup");
  await page.getByLabel("Name", { exact: true }).fill("E2E Student");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/verify-email-notice/);
  await page.getByRole("link", { name: "Open verification page", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Email verified", exact: true })).toBeVisible();
  await login(page, email, fixture.password);

  await page.goto(`/course-progress/${fixture.courseId}`);
  await expect(page).toHaveURL(new RegExp(`/course-detail/${fixture.courseId}$`));
  expect((await context.request.get(`${api}/progress/${fixture.courseId}`)).status()).toBe(403);
  const before = await (await context.request.get(`${api}/purchase/course/${fixture.courseId}/detail-with-status`)).json();
  expect(before.course.lectures.every((lecture) => !lecture.videoUrl)).toBe(true);
  await expect(page.getByRole("link", { name: "payments and refunds policy", exact: true })).toHaveAttribute("href", "/refund-policy");
  const popupReady = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Request via WhatsApp", exact: true }).click();
  const popup = await popupReady;
  await expect(popup).toHaveURL(/https:\/\/wa\.me\//);
  await expect(popup.getByText(/No message was sent/)).toBeVisible();
  await popup.close();
  await expect(page.getByText(/Your order is pending/)).toBeVisible();
  expect((await context.request.get(`${api}/progress/${fixture.courseId}`)).status()).toBe(403);

  const instructor = await browser.newContext({ baseURL: "http://127.0.0.1:5193" });
  try {
    await isolate(instructor);
    const instructorPage = await instructor.newPage();
    await login(instructorPage, fixture.instructorEmail, fixture.password);
    await instructorPage.goto("/instructor/orders?status=pending");
    const order = instructorPage.getByRole("article").filter({ hasText: email });
    await expect(order).toHaveCount(1);
    instructorPage.once("dialog", (dialog) => dialog.accept());
    await order.getByRole("button", { name: "Confirm payment", exact: true }).click();
    await expect(order).toHaveCount(0);
  } finally { await instructor.close(); }

  await page.bringToFront();
  await page.reload();
  await page.getByRole("button", { name: "Continue Course", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/course-progress/${fixture.courseId}$`));
  // The URL changes before the lazy route replaces the previous course preview.
  await expect(page.getByText("0 of 1 lectures completed", { exact: true })).toBeVisible();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  // The player deliberately waits for user intent before downloading video.
  await expect(video).toHaveAttribute("preload", "none");
  await video.evaluate(element => element.play());
  await expect.poll(() => video.evaluate((element) => element.ended)).toBe(true);
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
  const saved = await (await context.request.get(`${api}/progress/${fixture.courseId}`)).json();
  expect(saved.data.completed).toBe(true);
  expect(saved.data.progress).toEqual(expect.arrayContaining([expect.objectContaining({ lectureId: fixture.lectureId, viewed: true })]));
  await page.reload();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("student-completed.png"), fullPage: false });
});

test("admin searches all users, retains page filters, and loads course access on demand", async ({ page }) => {
  const fixture = await fixtures();
  await login(page, fixture.adminEmail, fixture.password);
  let courseReads = 0;
  page.on("request", request => { if (request.url().includes("/course/admin/course-access")) courseReads++; });
  await page.goto("/admin/users?q=E2E+Member&role=student&page=2");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
  await page.getByRole("navigation", { name: "User pages", exact: true }).getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(20);
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
  expect(courseReads).toBe(0);
  await page.getByLabel("Search users", { exact: true }).fill("e2e-member-24@example.test");
  await page.getByRole("button", { name: "Search users", exact: true }).click();
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.getByRole("heading", { level: 2, name: "E2E Member 24", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Manage Course Access", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Manage Course Access", exact: true })).toBeVisible();
  await expect(dialog.getByRole("article")).toHaveCount(12);
  expect(courseReads).toBe(1);
  await dialog.getByRole("navigation", { name: "Course access pages", exact: true }).getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog.getByRole("article")).toHaveCount(12);
  await dialog.getByLabel("Course search", { exact: true }).fill("E2E Physics Journey");
  await dialog.getByRole("button", { name: "Search courses", exact: true }).click();
  await expect(dialog.getByRole("article")).toHaveCount(1);
  await expect(dialog.getByText("E2E Physics Journey", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Grant access", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Revoke", exact: true })).toBeEnabled();
  await page.screenshot({ path: test.info().outputPath("admin-course-access.png"), fullPage: false, animations: "disabled" });
  await dialog.getByLabel("Course access", { exact: true }).click();
  await page.getByRole("option", { name: "Available To Grant", exact: true }).click();
  await expect(dialog.getByText("No matching courses found", { exact: true })).toBeVisible();
  await dialog.getByLabel("Course access", { exact: true }).click();
  await page.getByRole("option", { name: "Granted Courses", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Revoke", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(dialog.getByText("No matching courses found", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Clear filters", exact: true }).click();
  await dialog.getByLabel("Course search", { exact: true }).fill("E2E Instructor");
  await dialog.getByRole("button", { name: "Search courses", exact: true }).click();
  await expect(dialog.getByText("Matching courses: 27", { exact: true })).toBeVisible();
  await dialog.getByLabel("Publication status", { exact: true }).click();
  await page.getByRole("option", { name: "Draft", exact: true }).click();
  await expect(dialog.getByText("E2E unpublished draft", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("article")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.getByLabel("Account status", { exact: true }).click();
  await page.getByRole("option", { name: "Suspended", exact: true }).click();
  await expect(page.getByText("No matching users found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(20);
  await page.screenshot({ path: test.info().outputPath("admin-users.png"), fullPage: false });
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByLabel("ابحث عن مستخدم", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("admin-users-ar-mobile.png"), fullPage: false });
  await page.getByLabel("ابحث عن مستخدم", { exact: true }).fill("e2e-member-24@example.test");
  await page.getByRole("button", { name: "ابحث عن مستخدم", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1);
  await page.getByRole("button", { name: "إدارة الوصول للكورسات", exact: true }).click();
  await expect(dialog.getByRole("article")).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("admin-course-access-ar-mobile.png"), fullPage: false, animations: "disabled" });
});

test.describe("mobile catalog", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("keeps pagination usable without horizontal overflow", async ({ page }) => {
    await page.goto("/courses?page=2");
    await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(12);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=3/);
    await expect(page.locator('a[href^="/course-detail/"]')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("mobile-catalog.png"), fullPage: false });
  });
});
