import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build (`npm run build` first).
 * Uses the database in DATABASE_URL: run them on a seeded test/staging database,
 * never on live data. The setup creates a throwaway admin and teardown removes
 * everything the tests submitted.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
// Use a preinstalled Chromium when provided (otherwise run `npx playwright install chromium`).
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: { baseURL, trace: "retain-on-failure", launchOptions },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
    {
      name: "mobile",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Pixel 7"], launchOptions },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: `${baseURL}/ar`, reuseExistingServer: true, timeout: 60_000 },
});
