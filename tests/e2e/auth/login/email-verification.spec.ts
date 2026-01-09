// tests/e2e/auth/login/email-verification.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";

test.describe("Email Verification Flow", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  test("should redirect to verification after unverified login attempt", async ({ page }) => {
    // Create unverified user
    await page.request.post("http://localhost:3000/api/auth/register", {
      data: {
        email: "unverified@test.com",
        password: "Password123!",
        updatesOptIn: false,
      },
    });

    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "unverified@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');

    await expect(page).toHaveURL(/flow=verify-email/);
    await expect(page.locator("text=/Verify your email/i")).toBeVisible();
  });

  test("should display email address being verified", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    await expect(page.locator("text=/test@example.com/i")).toBeVisible();
  });

  test("should have disabled email field in verify mode", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    const emailInput = page.locator('[data-testid="email"]');
    await expect(emailInput).toBeDisabled();
  });

  test("should verify code and redirect to home", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com&verifyFlow=signup");
    
    await page.route("/api/auth/verify-email", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, nextPath: "/" }),
      });
    });

    await page.fill('[data-testid="email-code"]', "123456");
    await page.click("text=/Verify.*continue/i");

    await expect(page).toHaveURL(/\//);
  });

  test("should show error for invalid verification code", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    await page.route("/api/auth/verify-email", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Invalid or expired code" }),
      });
    });

    await page.fill('[data-testid="email-code"]', "999999");
    await page.click("text=/Verify.*continue/i");

    await expect(page.locator("text=/Invalid or expired/i")).toBeVisible();
  });

  test("should resend verification code", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    let resendCount = 0;
    await page.route("/api/auth/resend-verification", async (route) => {
      resendCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.waitForTimeout(2000); // Wait for cooldown
    await page.click("text=/Resend code/i");

    await expect(page.locator("text=/Code sent/i")).toBeVisible();
    expect(resendCount).toBe(1);
  });

  test("should show resend cooldown timer", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    const resendButton = page.locator("text=/Resend/i");
    await expect(resendButton).toHaveText(/\d+s/);
    await expect(resendButton).toBeDisabled();
  });

  test("should enable resend after cooldown expires", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    const resendButton = page.locator("text=/Resend/i");
    
    // Wait for cooldown to expire
    await page.waitForTimeout(3000);
    
    await expect(resendButton).not.toBeDisabled();
    await expect(resendButton).toHaveText(/Resend code/i);
  });

  test("should handle verification for signup flow", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com&verifyFlow=signup");
    
    await expect(page.locator("text=/Activate your account/i")).toBeVisible();
  });

  test("should handle verification for signin flow", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com&verifyFlow=signin");
    
    await expect(page.locator("text=/Verify your email/i")).toBeVisible();
  });

  test("should navigate back to login", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    await page.click("text=/Back to sign in/i");
    await expect(page).toHaveURL("/auth/login");
  });

  test("should preserve next parameter through verification", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com&next=/products");
    
    await page.route("/api/auth/verify-email", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, nextPath: "/products" }),
      });
    });

    await page.fill('[data-testid="email-code"]', "123456");
    await page.click("text=/Verify.*continue/i");

    await expect(page).toHaveURL(/\/products/);
  });

  test("should show loading state during verification", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    await page.route("/api/auth/verify-email", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.fill('[data-testid="email-code"]', "123456");
    await page.click("text=/Verify.*continue/i");

    const button = page.locator("button:has-text('Verifying')");
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test("should require 6-digit code", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    await page.fill('[data-testid="email-code"]', "12345");
    await page.click("text=/Verify.*continue/i");

    // Should not submit with incomplete code
    await expect(page).toHaveURL(/verify-email/);
  });

  test("should only accept numeric input", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    const codeInput = page.locator('[data-testid="email-code"]');
    await codeInput.fill("abc123");
    
    const value = await codeInput.inputValue();
    expect(value).toMatch(/^\d*$/); // Only digits
  });

  test("should have accessible form labels", async ({ page }) => {
    await page.goto("/auth/login?flow=verify-email&email=test@example.com");
    
    const codeInput = page.locator('[data-testid="email-code"]');
    await expect(codeInput).toHaveAttribute("aria-label");
    
    const label = page.locator("text=/Verification code/i");
    await expect(label).toBeVisible();
  });
});