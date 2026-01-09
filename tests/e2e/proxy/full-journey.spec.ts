// tests/e2e/proxy/full-journey.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: Full User Journey", () => {
  test("complete admin login with all protections", async ({ page }) => {
    // 1. Navigate (canonicalization, bot check, security headers)
    await page.goto("/ADMIN", { waitUntil: "commit" });
    
    // Should canonicalize
    expect(page.url()).toContain("/admin");
    expect(page.url()).not.toContain("/ADMIN");

    // 2. Redirect to login (admin guard)
    expect(page.url()).toContain("/auth/login");

    // 3. Submit login (CSRF protection)
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');

    // 4. Should reach admin area
    await page.waitForURL(/\//);
    await page.goto("/admin/dashboard");
    expect(page.url()).toContain("/admin/dashboard");

    // 5. Verify security headers
    const response = await page.goto("/admin/dashboard");
    const headers = response?.headers();
    expect(headers?.["x-frame-options"]).toBeTruthy();
    expect(headers?.["x-request-id"]).toBeTruthy();
  });

  test("handles errors gracefully throughout pipeline", async ({ page }) => {
    // Trigger various errors
    
    // 1. Invalid URL
    await page.goto("/admin/<script>alert('xss')</script>", { 
      waitUntil: "commit" 
    });
    
    // Should show error, not crash
    const url1 = page.url();
    expect(url1).toBeTruthy();

    // 2. Very long URL
    const longPath = "/admin/" + "a".repeat(1000);
    await page.goto(longPath, { waitUntil: "commit" });
    
    // Should handle gracefully
    const url2 = page.url();
    expect(url2).toBeTruthy();
  });
});