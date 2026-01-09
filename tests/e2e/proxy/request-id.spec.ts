// tests/e2e/proxy/request-id.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: Request ID", () => {
  test("includes request ID in response headers", async ({ page }) => {
    const response = await page.goto("/");
    
    const requestId = response?.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test("includes request ID in error page", async ({ page }) => {
    await page.goto("/nonexistent-page");
    
    // Error page should show or include request ID
    const content = await page.content();
    const hasRequestId = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(content);
    expect(hasRequestId).toBe(true);
  });
});