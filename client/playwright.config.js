import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.js",
  globalSetup: "./e2e/global-setup.js",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://127.0.0.1:5193", trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node ../server/scripts/startE2E.js", url: "http://127.0.0.1:8093/api/v1/course/published-courses", env: { NODE_ENV: "test", TADARUJ_E2E: "1" }, reuseExistingServer: false, timeout: 30000 },
    { command: "npm run dev -- --host 127.0.0.1 --port 5193 --strictPort", url: "http://127.0.0.1:5193", env: { VITE_API_BASE_URL: "http://127.0.0.1:8093" }, reuseExistingServer: false, timeout: 30000 },
  ],
});
