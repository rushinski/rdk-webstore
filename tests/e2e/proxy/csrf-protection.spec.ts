// tests/e2e/proxy/csrf-protection.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: CSRF Protection", () => {
  test("allows form submission with same origin", async ({ page }) => {
    await page.goto("/auth/login");
    
    // Fill and submit form
    await page.fill('[data-testid="login-email"]', "test@test.com");
    await page.fill('[data-testid="login-password"]', "password");
    await page.click('[data-testid="login-submit"]');
    
    // Should not be blocked by CSRF
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).not.toContain("csrf");
  });

  test("blocks cross-origin form submission", async ({ context }) => {
    // This test simulates a CSRF attack
    const response = await context.request.post("/api/admin/users", {
      headers: {
        "Origin": "http://evil.com",
        "Content-Type": "application/json",
      },
      data: { name: "hacker" },
    });

    expect(response.status()).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/csrf|origin/i);
  });

  test("allows Stripe webhook without origin", async ({ context }) => {
    const response = await context.request.post("/api/stripe/webhook", {
      headers: {
        "Stripe-Signature": "test-signature",
        "Content-Type": "application/json",
      },
      data: { type: "payment_intent.succeeded" },
    });

    // Should not be blocked by CSRF
    expect(response.status()).not.toBe(403);
  });

  test("allows 2FA verification without origin", async ({ context }) => {
    const response = await context.request.post("/api/auth/2fa/challenge/verify", {
      headers: {
        "Content-Type": "application/json",
      },
      data: { code: "123456" },
    });

    // Should not be blocked by CSRF
    expect(response.status()).not.toBe(403);
  });
});