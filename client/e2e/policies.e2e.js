import { test, expect } from "@playwright/test";

test("footer policies are public, localized, and usable after a direct mobile reload", async ({ page, context }) => {
  await context.addInitScript(() => {
    if (!localStorage.getItem("tadaruj_language")) localStorage.setItem("tadaruj_language", "en");
    if (!localStorage.getItem("vite-ui-theme")) localStorage.setItem("vite-ui-theme", "light");
  });
  await context.route("https://**/*", route => route.abort());
  const pages = [
    ["Privacy policy", "/privacy", "سياسة الخصوصية"],
    ["Terms of use", "/terms", "شروط الاستخدام"],
    ["Payments & refunds", "/refund-policy", "الدفع والاسترداد"],
  ];
  await page.goto("/");
  for (const [title, route] of pages) {
    await page.locator("footer").getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact on WhatsApp", exact: true })).toHaveAttribute("href", "https://wa.me/201125349769");
    await page.reload();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [, route, title] of pages) {
    await page.locator("footer").getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-academy-theme", "");
  }
  await page.getByRole("navigation", { name: "أقسام الصفحة", exact: true }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/refund-policy#before-paying$/);
  await expect(page.locator("#before-paying")).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("refund-policy-ar-mobile.png"), fullPage: false });
  await page.goto("/login?mode=signup");
  await expect(page.locator("footer")).toHaveCount(0);
  const signupPolicies = page.getByRole("navigation", { name: "السياسات", exact: true });
  for (const [, route, title] of pages) await expect(signupPolicies.getByRole("link", { name: title, exact: true })).toHaveAttribute("href", route);
  const policyPopup = page.waitForEvent("popup");
  await signupPolicies.getByRole("link", { name: "سياسة الخصوصية", exact: true }).click();
  const privacy = await policyPopup;
  await expect(privacy).toHaveURL(/\/privacy$/);
  await expect(privacy.getByRole("heading", { name: "سياسة الخصوصية", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login\?mode=signup$/);
  await privacy.close();
});
