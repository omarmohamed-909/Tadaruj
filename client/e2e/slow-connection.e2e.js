import { test, expect } from "@playwright/test";

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
