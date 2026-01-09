// tests/e2e/auth/password-reset/forgot-password.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";
import { createUserWithProfile } from "../../../helpers/supabase";

test.describe("Password Reset Flow", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  test.describe("Request Reset", () => {
    test("should navigate to forgot password from login @smoke", async ({ page }) => {
      await page.goto("/auth/login");
      
      await page.click("text=/Forgot/i");
      await expect(page).toHaveURL(/flow=forgot-password/);
      await expect(page.locator("text=/Reset password/i")).toBeVisible();
    });

    test("should request password reset", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login?flow=forgot-password");
      
      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await expect(page.locator("text=/Enter the code/i")).toBeVisible();
    });

    test("should not reveal if email exists", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.fill('[name="email"]', "nonexistent@test.com");
      await page.click("text=/Send reset code/i");

      // Should show same message for existing and non-existing emails
      await expect(page.locator("text=/sent.*code/i")).toBeVisible();
      await expect(page.locator("text=/not found/i")).not.toBeVisible();
    });

    test("should validate email format", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.fill('[name="email"]', "invalid-email");
      await page.click("text=/Send reset code/i");

      await expect(page.locator("text=/invalid/i")).toBeVisible();
    });

    test("should show loading state", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await expect(page.locator("button:has-text('Sending')")).toBeVisible();
    });
  });

  test.describe("Reset Password", () => {
    test("should reset password successfully", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      // Mock request
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      // Mock verify
      await page.route("/api/auth/forgot-password/verify-code", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="reset-code"]', "123456");
      
      // Mock update
      await page.route("/api/auth/update-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="new-password"]', "NewPassword123!");
      await page.fill('[name="confirm-password"]', "NewPassword123!");
      await page.click("text=/Update password/i");

      await expect(page.locator("text=/updated/i")).toBeVisible();
    });

    test("should show password requirements", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await expect(page.locator("text=/8\\+ characters/i")).toBeVisible();
    });

    test("should validate password confirmation", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await page.fill('[data-testid="reset-code"]', "123456");
      await page.fill('[name="new-password"]', "NewPassword123!");
      await page.fill('[name="confirm-password"]', "DifferentPassword!");
      await page.click("text=/Update password/i");

      await expect(page.locator("text=/do not match/i")).toBeVisible();
    });

    test("should validate password strength", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await page.fill('[data-testid="reset-code"]', "123456");
      await page.fill('[name="new-password"]', "weak");
      await page.fill('[name="confirm-password"]', "weak");
      await page.click("text=/Update password/i");

      await expect(page.locator("text=/requirements/i")).toBeVisible();
    });

    test("should show error for invalid reset code", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await page.route("/api/auth/forgot-password/verify-code", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: false, 
            error: "Invalid or expired code" 
          }),
        });
      });

      await page.fill('[data-testid="reset-code"]', "999999");
      await page.fill('[name="new-password"]', "NewPassword123!");
      await page.fill('[name="confirm-password"]', "NewPassword123!");
      await page.click("text=/Update password/i");

      await expect(page.locator("text=/Invalid or expired/i")).toBeVisible();
    });
  });

  test.describe("Resend Code", () => {
    test("should resend reset code", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      let sendCount = 0;
      await page.route("/api/auth/forgot-password", async (route) => {
        sendCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      await page.waitForTimeout(2000);
      await page.click("text=/Resend code/i");

      await expect(page.locator("text=/Code sent/i")).toBeVisible();
      expect(sendCount).toBe(2);
    });

    test("should show cooldown timer", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.click("text=/Send reset code/i");

      const resendButton = page.locator("text=/Resend/i");
      await expect(resendButton).toHaveText(/\d+s/);
      await expect(resendButton).toBeDisabled();
    });
  });

  test.describe("Navigation", () => {
    test("should navigate back to login", async ({ page }) => {
      await page.goto("/auth/login?flow=forgot-password");
      
      await page.click("text=/Back to sign in/i");
      await expect(page).toHaveURL("/auth/login");
    });
  });

  test.describe("Admin 2FA", () => {
    test("should require 2FA setup for admin after reset", async ({ page }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login?flow=forgot-password");
      
      await page.route("/api/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "admin@test.com");
      await page.click("text=/Send reset code/i");

      await page.route("/api/auth/forgot-password/verify-code", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: true,
            requiresTwoFASetup: true 
          }),
        });
      });

      await page.fill('[data-testid="reset-code"]', "123456");
      await page.fill('[name="new-password"]', "NewPassword123!");
      await page.fill('[name="confirm-password"]', "NewPassword123!");
      await page.click("text=/Update password/i");

      await expect(page).toHaveURL(/\/auth\/2fa\/setup/);
    });
  });
});