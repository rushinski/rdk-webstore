import { defineConfig, devices } from "@playwright/test";

const e2eMode = process.env.E2E_MODE === "vercel" ? "vercel" : "local";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const isVercel = e2eMode === "vercel";
const seedStrategy = process.env.E2E_SEED_STRATEGY ?? (isVercel ? "remote" : "cli");
if (!process.env.E2E_SEED_STRATEGY) {
  process.env.E2E_SEED_STRATEGY = seedStrategy;
}

const localProjects = [
  { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  { name: "tablet", use: { ...devices["iPad (gen 7)"] } },
  { name: "mobile", use: { ...devices["iPhone 13"] } },
  { name: "wide", use: { viewport: { width: 1920, height: 1080 } } },
];

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: seedStrategy === "none" ? undefined : 1,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: localProjects,
  webServer: isVercel
    ? undefined
    : {
        command: "npm run dev:test",
        url: baseURL,
        env: {
          NODE_ENV: "test",
          E2E_TEST_MODE: "1",
          NEXT_PUBLIC_E2E_TEST_MODE: "1",
          E2E_MODE: "local",
          E2E_SEED_STRATEGY: process.env.E2E_SEED_STRATEGY ?? "cli",
        },
        reuseExistingServer: !process.env.CI,
      },
  globalSetup: "./tests/e2e/global-setup.ts",
});
