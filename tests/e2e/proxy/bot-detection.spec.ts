// tests/e2e/proxy/bot-detection.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: Bot Detection", () => {
  test("allows normal browser navigation", async ({ page }) => {
    await page.goto("/admin");
    
    // Should not show bot block message
    await expect(page.locator("text=/bot blocked/i")).not.toBeVisible();
  });

  test("blocks curl-like requests", async ({ context }) => {
    // Set curl user agent
    await context.setExtraHTTPHeaders({
      "User-Agent": "curl/7.68.0",
    });

    const response = await context.request.get("/admin");
    expect(response.status()).toBe(403);
    
    const json = await response.json();
    expect(json.error).toMatch(/bot/i);
  });

  test("blocks wget-like requests", async ({ context }) => {
    await context.setExtraHTTPHeaders({
      "User-Agent": "Wget/1.20.3",
    });

    const response = await context.request.get("/admin");
    expect(response.status()).toBe(403);
  });

  test("blocks python-requests", async ({ context }) => {
    await context.setExtraHTTPHeaders({
      "User-Agent": "python-requests/2.28.1",
    });

    const response = await context.request.get("/api/admin/users");
    expect(response.status()).toBe(403);
  });

  test("allows Googlebot", async ({ context }) => {
    await context.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
    });

    const response = await context.request.get("/admin");
    // Should not be blocked
    expect(response.status()).not.toBe(403);
  });

  test("blocks empty user-agent", async ({ context }) => {
    await context.setExtraHTTPHeaders({
      "User-Agent": "",
    });

    const response = await context.request.get("/admin");
    expect(response.status()).toBe(403);
  });

  test("shows error page for blocked bot", async ({ context, page }) => {
    await context.setExtraHTTPHeaders({
      "User-Agent": "curl/7.68.0",
    });

    // Try to navigate
    const response = await page.goto("/admin", { waitUntil: "commit" });
    expect(response?.status()).toBe(403);
    
    // Should show error
    await expect(page.locator("text=/blocked/i")).toBeVisible();
  });
});

