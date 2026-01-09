// tests/e2e/auth/login/otp-login.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";
import { createUserWithProfile } from "../../../helpers/supabase";

test.describe("OTP Login Flow", () => {
  let baseData: Awaited<ReturnType<typeof resetAndSeedForE2E>>;

  test.beforeEach(async () => {
    baseData = await resetAndSeedForE2E();
  });

  test.describe("Request OTP Stage", () => {
    test("should switch to OTP flow from password login @smoke", async ({ page }) => {
      await page.goto("/auth/login");
      
      await page.click("text=/Sign in with email code/i");
      await expect(page).toHaveURL(/flow=otp/);
      await expect(page.locator("text=/Sign in with code/i")).toBeVisible();
    });

    test("should request OTP successfully", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      await expect(page.locator("text=/Enter the code/i")).toBeVisible();
    });

    test("should show loading state while sending", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      const button = page.locator("button:has-text('Sending')");
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();
    });

    test("should handle non-existent email without revealing", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "nonexistent@test.com");
      await page.click("text=/Send code/i");

      // Should not reveal that email doesn't exist
      await expect(page.locator("text=/Enter the code/i")).toBeVisible();
      await expect(page.locator("text=/not found/i")).not.toBeVisible();
    });

    test("should validate email format", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "invalid-email");
      await page.click("text=/Send code/i");

      await expect(page.locator("text=/invalid/i")).toBeVisible();
    });

    test("should require email field", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      await page.click("text=/Send code/i");

      const emailInput = page.locator('[data-testid="email"]');
      await expect(emailInput).toHaveAttribute("required");
    });
  });

  test.describe("Verify OTP Stage", () => {
    test("should verify OTP and login successfully", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Intercept OTP request to get code
      let otpCode = "";
      await page.route("/api/auth/otp/request", async (route) => {
        otpCode = "123456"; // Mock code
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.route("/api/auth/otp/verify", async (route) => {
        const postData = route.request().postDataJSON();
        if (postData.code === "123456") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, isAdmin: false }),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ ok: false, error: "Invalid code" }),
          });
        }
      });

      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      // Wait for code input
      await expect(page.locator("text=/Enter the code/i")).toBeVisible();

      // Enter code
      await page.fill('[data-testid="email-code"]', "123456");
      await page.click("text=/Sign in/i");

      await expect(page).toHaveURL(/\//);
    });

    test("should show error for invalid code", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      await page.fill('[data-testid="email-code"]', "999999");
      await page.click("text=/Sign in/i");

      await expect(page.locator("text=/invalid.*code/i")).toBeVisible();
    });

    test("should disable email field after code sent", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      const emailInput = page.locator('[data-testid="email"]');
      await expect(emailInput).toBeDisabled();
    });

    test("should autofocus code input after sending", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      const codeInput = page.locator('[data-testid="email-code"]');
      await expect(codeInput).toBeFocused();
    });

    test("should show numeric keyboard on mobile", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      const codeInput = page.locator('[data-testid="email-code"]');
      await expect(codeInput).toHaveAttribute("inputmode", "numeric");
      await expect(codeInput).toHaveAttribute("pattern", "[0-9]*");
    });
  });

  test.describe("Resend Functionality", () => {
    test("should resend OTP code", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      let requestCount = 0;
      await page.route("/api/auth/otp/request", async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      await expect(page.locator("text=/Enter the code/i")).toBeVisible();

      // Wait for cooldown to expire (or mock it)
      await page.waitForTimeout(1000);
      
      await page.click("text=/Resend code/i");
      await expect(page.locator("text=/Code sent/i")).toBeVisible();
      
      expect(requestCount).toBe(2);
    });

    test("should show cooldown timer", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      const resendButton = page.locator("text=/Resend/i");
      await expect(resendButton).toHaveText(/\d+s/);
      await expect(resendButton).toBeDisabled();
    });

    test("should enable resend after cooldown", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      const resendButton = page.locator("text=/Resend/i");
      
      // Wait for cooldown
      await page.waitForTimeout(2000);
      
      await expect(resendButton).not.toBeDisabled();
      await expect(resendButton).toHaveText(/Resend code/i);
    });

    test("should show loading state during resend", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      await page.waitForTimeout(2000);
      await page.click("text=/Resend code/i");

      await expect(page.locator("text=/Sending/i")).toBeVisible();
    });
  });

  test.describe("Admin 2FA Integration", () => {
    test("should redirect admin to 2FA setup if needed", async ({ page }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.route("/api/auth/otp/verify", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: true, 
            isAdmin: true,
            requiresTwoFASetup: true 
          }),
        });
      });

      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "admin@test.com");
      await page.click("text=/Send code/i");
      await page.fill('[data-testid="email-code"]', "123456");
      await page.click("text=/Sign in/i");

      await expect(page).toHaveURL(/\/auth\/2fa\/setup/);
    });

    test("should redirect admin to 2FA challenge if enrolled", async ({ page }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.route("/api/auth/otp/verify", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: true, 
            isAdmin: true,
            requiresTwoFAChallenge: true 
          }),
        });
      });

      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "admin@test.com");
      await page.click("text=/Send code/i");
      await page.fill('[data-testid="email-code"]', "123456");
      await page.click("text=/Sign in/i");

      await expect(page).toHaveURL(/\/auth\/2fa\/challenge/);
    });

    test("should redirect admin to dashboard after 2FA", async ({ page }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.route("/api/auth/otp/verify", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: true, 
            isAdmin: true 
          }),
        });
      });

      await page.goto("/auth/login?flow=otp");
      await page.fill('[data-testid="email"]', "admin@test.com");
      await page.click("text=/Send code/i");
      await page.fill('[data-testid="email-code"]', "123456");
      await page.click("text=/Sign in/i");

      await expect(page).toHaveURL(/\/admin/);
    });
  });

  test.describe("Navigation", () => {
    test("should navigate back to password login", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.click("text=/Back to sign in/i");
      await expect(page).toHaveURL("/auth/login");
      await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
    });

    test("should preserve next parameter", async ({ page }) => {
      await page.goto("/auth/login?flow=otp&next=/products");
      
      await page.route("/api/auth/otp/verify", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, isAdmin: false }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");
      await page.fill('[data-testid="email-code"]', "123456");
      await page.click("text=/Sign in/i");

      await expect(page).toHaveURL(/\/products/);
    });
  });

  test.describe("Error Handling", () => {
    test("should handle server errors gracefully", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "Server error" }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      await expect(page.locator("text=/error/i")).toBeVisible();
    });

    test("should handle rate limiting", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: false, 
            error: "Too many requests" 
          }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      await expect(page.locator("text=/Too many requests/i")).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      const emailInput = page.locator('[data-testid="email"]');
      await expect(emailInput).toHaveAttribute("aria-label");
      
      const sendButton = page.locator("text=/Send code/i");
      await expect(sendButton).toHaveAccessibleName(/send/i);
    });

    test("should announce state changes to screen readers", async ({ page }) => {
      await page.goto("/auth/login?flow=otp");
      
      await page.route("/api/auth/otp/request", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="email"]', "user@test.com");
      await page.click("text=/Send code/i");

      // Check for aria-live region
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeVisible();
    });
  });
});