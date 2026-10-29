import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("mobile public pages stay usable during a stalled session check and the deferred menu retains keyboard focus", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addInitScript(() => {
    localStorage.setItem("tadaruj_language", "en");
    localStorage.setItem("vite-ui-theme", "light");
  });
  let checks = 0;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await context.route("**/api/v1/user/profile", async route => {
    checks++;
    await pending;
    await route.fulfill({ status: 401, json: { message: "Not authenticated" } });
  });
  await context.route("https://**/*", route => route.abort());
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible();
    await expect.poll(() => checks).toBe(1);
    const menu = page.getByRole("button", { name: "Open menu", exact: true });
    await menu.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(menu).toBeFocused();
    await menu.click();
    await dialog.getByRole("link", { name: "Courses", exact: true }).click();
    await expect(page).toHaveURL(/\/courses$/);
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    expect(checks).toBe(1);
    await menu.click();
    await dialog.getByRole("button", { name: "Change language" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "فتح القائمة", exact: true })).toBeFocused();
  } finally { release(); }
});

test("a cached admin cannot enter on a failed connection and can retry without a footer jumping into view", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addInitScript(() => {
    localStorage.setItem("tadaruj_language", "en");
    localStorage.setItem("lms_auth_user", JSON.stringify({ _id: "cached-only-test-user", name: "Cached admin", role: "admin" }));
    localStorage.setItem("lms_auth_token", "local-test-placeholder");
  });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let checks = 0;
  await context.route("**/api/v1/user/profile", async route => {
    checks++;
    if (checks === 1) { await pending; await route.fulfill({ status: 503, json: { message: "Temporarily unavailable" } }); }
    else await route.fulfill({ status: 401, json: { message: "Not authenticated" } });
  });
  await context.route("https://**/*", route => route.abort());
  try {
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Users Management", exact: true })).not.toBeVisible();
    expect(await page.locator("footer").evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(844);
    release();
    await expect(page.getByRole("heading", { name: "Could not check your connection." })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("lms_auth_token"))).toBe("local-test-placeholder");
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("lms_auth_token"))).toBeNull();
    // A change of identity also validates the cleared session once.
    expect(checks).toBeGreaterThanOrEqual(2);
    expect(checks).toBeLessThanOrEqual(3);
  } finally { release(); }
});

test("a delayed anonymous session response cannot undo a successful login", async ({ page, context }) => {
  const fixture = JSON.parse(await readFile(new URL("../../.test-runtime/e2e-fixtures.json", import.meta.url), "utf8"));
  await context.addInitScript(() => localStorage.setItem("tadaruj_language", "en"));
  await context.route("https://**/*", route => route.abort());
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let checks = 0;
  await context.route("**/api/v1/user/profile", async route => {
    checks++;
    if (checks === 1) {
      await pending;
      await route.fulfill({ status: 401, json: { message: "Not authenticated" } });
    } else await route.continue();
  });
  try {
    await page.goto("/login?mode=login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email", { exact: true }).fill("e2e-member-24@example.test");
    await page.getByLabel("Password", { exact: true }).fill(fixture.password);
    await page.getByRole("tabpanel", { name: "Log in", exact: true }).getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL("http://127.0.0.1:5193/");
    release();
    await page.goto("/my-learning");
    await expect(page.getByRole("heading", { name: "Your learning space", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/my-learning$/);
    expect(await page.evaluate(() => Boolean(localStorage.getItem("lms_auth_token")))).toBe(true);
  } finally { release(); }
});
