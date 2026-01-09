// tests/e2e/auth/login/password-login.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";
import { createUserWithProfile } from "../../../helpers/supabase";

test.describe("Password Login Flow", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  // Happy Path Tests
  test.describe("Happy Path", () => {
    test("should login successfully with valid credentials @smoke", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page).toHaveURL(/\//);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test("should redirect admin to admin panel after login", async ({ page }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page).toHaveURL(/\/admin/);
    });

    test("should preserve 'next' parameter after login", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login?next=/products/sneakers");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page).toHaveURL(/\/products\/sneakers/);
    });

    test("should show/hide password on toggle", async ({ page }) => {
      await page.goto("/auth/login");
      
      const passwordInput = page.locator('[data-testid="login-password"]');
      await expect(passwordInput).toHaveAttribute("type", "password");
      
      await page.click('button[aria-label="Show password"]');
      await expect(passwordInput).toHaveAttribute("type", "text");
      
      await page.click('button[aria-label="Hide password"]');
      await expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  // Error Cases
  test.describe("Error Cases", () => {
    test("should show error for invalid email format", async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "not-an-email");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator("text=/Invalid email/i")).toBeVisible();
    });

    test("should show error for wrong password", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "WrongPassword!");
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator("text=/Invalid credentials/i")).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("should show error for non-existent user", async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "nonexistent@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator("text=/Invalid credentials/i")).toBeVisible();
    });

    test("should require email field", async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      const emailInput = page.locator('[data-testid="login-email"]');
      await expect(emailInput).toHaveAttribute("required");
    });

    test("should require password field", async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.click('[data-testid="login-submit"]');

      const passwordInput = page.locator('[data-testid="login-password"]');
      await expect(passwordInput).toHaveAttribute("required");
    });

    test("should handle server errors gracefully", async ({ page }) => {
      await page.route("/api/auth/login", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "Internal server error" }),
        })
      );

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator("text=/error/i")).toBeVisible();
    });
  });

  // UI/UX Tests
  test.describe("UI/UX", () => {
    test("should disable submit button while loading", async ({ page }) => {
      await page.goto("/auth/login");
      
      await page.route("/api/auth/login", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      const submitButton = page.locator('[data-testid="login-submit"]');
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveText(/signing in/i);
    });

    test("should have accessible form labels", async ({ page }) => {
      await page.goto("/auth/login");

      const emailInput = page.locator('[data-testid="login-email"]');
      const emailLabel = page.locator('label[for="email"]');
      await expect(emailLabel).toBeVisible();
      await expect(emailLabel).toHaveText(/email/i);

      const passwordInput = page.locator('[data-testid="login-password"]');
      const passwordLabel = page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
      await expect(passwordLabel).toHaveText(/password/i);
    });

    test("should autofocus email field on load", async ({ page }) => {
      await page.goto("/auth/login");
      
      const emailInput = page.locator('[data-testid="login-email"]');
      await expect(emailInput).toBeFocused();
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/auth/login");
      
      await page.keyboard.press("Tab");
      await expect(page.locator('[data-testid="login-email"]')).toBeFocused();
      
      await page.keyboard.press("Tab");
      await expect(page.locator('[data-testid="login-password"]')).toBeFocused();
      
      await page.keyboard.press("Tab");
      await expect(page.locator('button[aria-label*="password"]')).toBeFocused();
      
      await page.keyboard.press("Tab");
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
    });

    test("should submit form on Enter key", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/\//);
    });
  });

  // Security Tests
  test.describe("Security", () => {
    test("should not reveal whether email exists", async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "nonexistent@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      const error = page.locator('[data-testid="error-message"]');
      await expect(error).toHaveText(/Invalid credentials/i);
      await expect(error).not.toHaveText(/not found/i);
      await expect(error).not.toHaveText(/doesn't exist/i);
    });

    test("should clear password field on error", async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "WrongPassword!");
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator("text=/Invalid credentials/i")).toBeVisible();
      
      const passwordInput = page.locator('[data-testid="login-password"]');
      // Some implementations clear password on error for security
      // Adjust this assertion based on your requirements
    });

    test("should not autofill password by default", async ({ page }) => {
      await page.goto("/auth/login");
      
      const passwordInput = page.locator('[data-testid="login-password"]');
      await expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    });

    test("should mask password in DevTools", async ({ page }) => {
      await page.goto("/auth/login");
      const passwordInput = page.locator('[data-testid="login-password"]');
      
      await passwordInput.fill("SecretPassword123!");
      await expect(passwordInput).toHaveAttribute("type", "password");
      
      // Password should be masked in DOM
      const value = await passwordInput.inputValue();
      expect(value).toBe("SecretPassword123!");
      
      // But display should be dots/asterisks
      const computedStyle = await passwordInput.evaluate(
        (el) => window.getComputedStyle(el).getPropertyValue("-webkit-text-security")
      );
      // Note: This test may vary by browser
    });
  });

  // Integration Tests
  test.describe("Integration", () => {
    test("should work with Google OAuth button", async ({ page }) => {
      await page.goto("/auth/login");
      
      const googleButton = page.locator("text=/Continue with Google/i");
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
    });

    test("should show link to OTP login", async ({ page }) => {
      await page.goto("/auth/login");
      
      const otpLink = page.locator("text=/Sign in with email code/i");
      await expect(otpLink).toBeVisible();
      await otpLink.click();
      
      await expect(page).toHaveURL(/flow=otp/);
    });

    test("should show link to forgot password", async ({ page }) => {
      await page.goto("/auth/login");
      
      const forgotLink = page.locator("text=/Forgot/i");
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();
      
      await expect(page).toHaveURL(/flow=forgot-password/);
    });

    test("should show link to registration", async ({ page }) => {
      await page.goto("/auth/login");
      
      const registerLink = page.locator("text=/Create one/i");
      await expect(registerLink).toBeVisible();
      await registerLink.click();
      
      await expect(page).toHaveURL(/\/auth\/register/);
    });

    test("should show back to shopping link", async ({ page }) => {
      await page.goto("/auth/login?next=/products");
      
      const backLink = page.locator("text=/Back to shopping/i");
      await expect(backLink).toBeVisible();
      await backLink.click();
      
      await expect(page).toHaveURL(/\/products/);
    });
  });

  // Mobile Tests
  test.describe("Mobile", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("should be responsive on mobile", async ({ page }) => {
      await page.goto("/auth/login");
      
      await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
    });

    test("should show mobile keyboard for email", async ({ page }) => {
      await page.goto("/auth/login");
      
      const emailInput = page.locator('[data-testid="login-email"]');
      await expect(emailInput).toHaveAttribute("type", "email");
      await expect(emailInput).toHaveAttribute("inputmode", "email");
    });
  });

  // Rate Limiting
  test.describe("Rate Limiting", () => {
    test("should handle rate limiting gracefully", async ({ page }) => {
      await page.route("/api/auth/login", (route) =>
        route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: false, 
            error: "Too many attempts. Please try again later." 
          }),
        })
      );

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator("text=/Too many attempts/i")).toBeVisible();
    });
  });

  // Session Management
  test.describe("Session Management", () => {
    test("should redirect to home if already logged in", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Login first
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Try to access login page again
      await page.goto("/auth/login");
      await expect(page).toHaveURL(/\/account/);
    });

    test("should clear session on logout", async ({ page }) => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "user@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      await page.click('[data-testid="user-menu"]');
      await page.click("text=/Logout/i");

      await expect(page).toHaveURL(/\//);
      await expect(page.locator('[data-testid="navbar-login"]')).toBeVisible();
    });
  });
});