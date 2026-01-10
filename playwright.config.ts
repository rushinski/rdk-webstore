// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./tests/helpers/env/load-test-env";

loadTestEnv();

export default defineConfig({
  testDir: "./tests/e2e",

  // DB reset/seed is global shared state → do NOT run fully parallel
  fullyParallel: false,
  workers: process.env.CI ? 1 : 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 12"] } },
  ],

  webServer: {
    // Ensure Next dev runs on the same port as TEST_BASE_URL (3100)
    command: "npm run dev -- --port 3100",
    url: process.env.TEST_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
