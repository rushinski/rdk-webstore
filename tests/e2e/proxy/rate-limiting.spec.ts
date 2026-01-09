// tests/e2e/proxy/rate-limiting.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: Rate Limiting", () => {
  test("applies rate limit to rapid requests", async ({ context }) => {
    // Make many requests quickly
    const requests = Array.from({ length: 35 }, (_, i) => 
      context.request.get(`/api/health?req=${i}`)
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);
    
    expect(rateLimited).toBe(true);
  });

  test("shows rate limit page for browser requests", async ({ page }) => {
    // Make many requests to trigger rate limit
    for (let i = 0; i < 35; i++) {
      await page.goto("/admin", { waitUntil: "commit" });
    }

    // Next request should show rate limit page
    await page.goto("/admin", { waitUntil: "commit" });
    
    // Should be on rate limit page or show message
    const url = page.url();
    const hasRateLimitIndicator = url.includes("too-many-requests") || 
                                  await page.locator("text=/rate limit/i").isVisible();
    
    expect(hasRateLimitIndicator).toBe(true);
  });

  test("includes rate limit headers in API response", async ({ context }) => {
    // Trigger rate limit
    const requests = Array.from({ length: 35 }, () => 
      context.request.get("/api/health")
    );

    const responses = await Promise.all(requests);
    const limitedResponse = responses.find(r => r.status() === 429);
    
    if (limitedResponse) {
      const headers = limitedResponse.headers();
      expect(headers["x-ratelimit-limit"]).toBeTruthy();
      expect(headers["x-ratelimit-remaining"]).toBeTruthy();
      expect(headers["x-ratelimit-reset"]).toBeTruthy();
    }
  });

  test("rate limit resets after window", async ({ context }) => {
    // Trigger rate limit
    const requests1 = Array.from({ length: 35 }, () => 
      context.request.get("/api/health")
    );
    await Promise.all(requests1);

    // Wait for rate limit window to reset (1 minute + buffer)
    await new Promise(resolve => setTimeout(resolve, 65000));

    // Should be able to make requests again
    const response = await context.request.get("/api/health");
    expect(response.status()).not.toBe(429);
  }).slow();

  test("different IPs have separate rate limits", async ({ browser }) => {
    // Create two contexts (simulating different IPs in practice)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    // Exhaust limit in first context
    const requests1 = Array.from({ length: 35 }, () => 
      context1.request.get("/api/health")
    );
    await Promise.all(requests1);

    // Second context should still work
    const response2 = await context2.request.get("/api/health");
    expect(response2.status()).not.toBe(429);

    await context1.close();
    await context2.close();
  });
});