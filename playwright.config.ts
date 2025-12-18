import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  webServer: baseURL.includes("127.0.0.1")
    ? {
        command: "npm run dev:test",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        env: { NODE_ENV: "test" },
      }
    : undefined,
});
