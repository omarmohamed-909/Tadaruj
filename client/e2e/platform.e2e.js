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
  await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThanOrEqual(3);
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
