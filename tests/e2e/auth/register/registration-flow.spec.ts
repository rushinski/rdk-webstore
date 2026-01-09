// tests/e2e/auth/register/registration-flow.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";

test.describe("Registration Flow", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  test.describe("Happy Path", () => {
    test("should register successfully with valid data @smoke", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "newuser@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.click("text=/Create account/i");

      await expect(page).toHaveURL(/verify-email/);
    });

    test("should register with email marketing opt-in", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "marketing@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.check('input[type="checkbox"]');
      await page.click("text=/Create account/i");

      await expect(page).toHaveURL(/verify-email/);
    });

    test("should show password requirements", async ({ page }) => {
      await page.goto("/auth/register");
      
      await expect(page.locator("text=/8\\+ characters/i")).toBeVisible();
      await expect(page.locator("text=/Varied characters/i")).toBeVisible();
    });

    test("should update requirements as password is typed", async ({ page }) => {
      await page.goto("/auth/register");
      
      const passwordInput = page.locator('[name="password"]');
      
      // Type short password
      await passwordInput.fill("Pass1");
      await expect(page.locator("text=/8\\+ characters/i")).toHaveClass(/zinc-600/);
      
      // Type longer password
      await passwordInput.fill("Password123!");
      await expect(page.locator("text=/8\\+ characters/i")).toHaveClass(/emerald-500|zinc-300/);
    });

    test("should preserve next parameter through registration", async ({ page }) => {
      await page.goto("/auth/register?next=/products");
      
      await page.fill('[name="email"]', "newuser@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.click("text=/Create account/i");

      await expect(page).toHaveURL(/next=%2Fproducts/);
    });
  });

  test.describe("Validation", () => {
    test("should show error for invalid email", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "invalid-email");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.click("text=/Create account/i");

      await expect(page.locator("text=/Invalid email/i")).toBeVisible();
    });

    test("should show error for password mismatch", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "user@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "DifferentPass!");
      await page.click("text=/Create account/i");

      await expect(page.locator("text=/Passwords do not match/i")).toBeVisible();
    });

    test("should show error for weak password", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "user@test.com");
      await page.fill('[name="password"]', "weak");
      await page.fill('[name="confirmPassword"]', "weak");
      await page.click("text=/Create account/i");

      await expect(page.locator("text=/requirements/i")).toBeVisible();
    });

    test("should show error for repeated character password", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "user@test.com");
      await page.fill('[name="password"]', "aaaaaaaa");
      await page.fill('[name="confirmPassword"]', "aaaaaaaa");
      await page.click("text=/Create account/i");

      await expect(page.locator("text=/requirements/i")).toBeVisible();
    });

    test("should require email field", async ({ page }) => {
      await page.goto("/auth/register");
      
      const emailInput = page.locator('[name="email"]');
      await expect(emailInput).toHaveAttribute("required");
    });

    test("should require password field", async ({ page }) => {
      await page.goto("/auth/register");
      
      const passwordInput = page.locator('[name="password"]');
      await expect(passwordInput).toHaveAttribute("required");
    });

    test("should require confirm password field", async ({ page }) => {
      await page.goto("/auth/register");
      
      const confirmInput = page.locator('[name="confirmPassword"]');
      await expect(confirmInput).toHaveAttribute("required");
    });
  });

  test.describe("Password Visibility", () => {
    test("should toggle password visibility", async ({ page }) => {
      await page.goto("/auth/register");
      
      const passwordInput = page.locator('[name="password"]');
      await expect(passwordInput).toHaveAttribute("type", "password");
      
      await page.click('[aria-label*="Show password"]').first();
      await expect(passwordInput).toHaveAttribute("type", "text");
      
      await page.click('[aria-label*="Hide password"]').first();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });

    test("should toggle confirm password visibility independently", async ({ page }) => {
      await page.goto("/auth/register");
      
      const passwordInput = page.locator('[name="password"]');
      const confirmInput = page.locator('[name="confirmPassword"]');
      
      // Show password
      await page.click('[aria-label*="Show password"]').first();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await expect(confirmInput).toHaveAttribute("type", "password");
      
      // Show confirm password
      await page.click('[aria-label*="Show password"]').last();
      await expect(confirmInput).toHaveAttribute("type", "text");
    });
  });

  test.describe("OAuth Integration", () => {
    test("should show Google OAuth button", async ({ page }) => {
      await page.goto("/auth/register");
      
      const googleButton = page.locator("text=/Continue with Google/i");
      await expect(googleButton).toBeVisible();
    });

    test("should have divider between OAuth and form", async ({ page }) => {
      await page.goto("/auth/register");
      
      await expect(page.locator("text=/or/i")).toBeVisible();
    });
  });

  test.describe("Terms & Privacy", () => {
    test("should show terms and privacy links", async ({ page }) => {
      await page.goto("/auth/register");
      
      await expect(page.locator('a[href="/legal/terms"]')).toBeVisible();
      await expect(page.locator('a[href="/legal/privacy"]')).toBeVisible();
    });

    test("should have working terms link", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.click('a[href="/legal/terms"]');
      await expect(page).toHaveURL(/\/legal\/terms/);
    });

    test("should have working privacy link", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.click('a[href="/legal/privacy"]');
      await expect(page).toHaveURL(/\/legal\/privacy/);
    });
  });

  test.describe("Navigation", () => {
    test("should link to login page", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.click("text=/Sign in/i");
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("should have back to shopping link", async ({ page }) => {
      await page.goto("/auth/register?next=/products");
      
      const backLink = page.locator("text=/Back to shopping/i");
      await expect(backLink).toBeVisible();
      await backLink.click();
      
      await expect(page).toHaveURL(/\/products/);
    });
  });

  test.describe("UI/UX", () => {
    test("should disable submit button while loading", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.route("/api/auth/register", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.click("text=/Create account/i");

      const submitButton = page.locator("button:has-text('Creating')");
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    test("should have accessible form labels", async ({ page }) => {
      await page.goto("/auth/register");
      
      await expect(page.locator("label:has-text('Email')")).toBeVisible();
      await expect(page.locator("label:has-text('Password')").first()).toBeVisible();
      await expect(page.locator("label:has-text('Confirm password')")).toBeVisible();
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.keyboard.press("Tab");
      await expect(page.locator('[name="email"]')).toBeFocused();
      
      await page.keyboard.press("Tab");
      await expect(page.locator('[name="password"]')).toBeFocused();
      
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab"); // Skip show/hide button
      await expect(page.locator('[name="confirmPassword"]')).toBeFocused();
    });

    test("should submit form on Enter key", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.fill('[name="email"]', "user@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/verify-email/);
    });
  });

  test.describe("Mobile", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("should be responsive on mobile", async ({ page }) => {
      await page.goto("/auth/register");
      
      await expect(page.locator('[name="email"]')).toBeVisible();
      await expect(page.locator('[name="password"]')).toBeVisible();
      await expect(page.locator('[name="confirmPassword"]')).toBeVisible();
      await expect(page.locator("text=/Create account/i")).toBeVisible();
    });

    test("should show email keyboard on mobile", async ({ page }) => {
      await page.goto("/auth/register");
      
      const emailInput = page.locator('[name="email"]');
      await expect(emailInput).toHaveAttribute("type", "email");
    });
  });

  test.describe("Error Handling", () => {
    test("should handle duplicate email", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.route("/api/auth/register", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: false, 
            error: "Email already exists" 
          }),
        });
      });

      await page.fill('[name="email"]', "existing@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.click("text=/Create account/i");

      await expect(page.locator("text=/already exists/i")).toBeVisible();
    });

    test("should handle server errors", async ({ page }) => {
      await page.goto("/auth/register");
      
      await page.route("/api/auth/register", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ 
            ok: false, 
            error: "Server error" 
          }),
        });
      });

      await page.fill('[name="email"]', "user@test.com");
      await page.fill('[name="password"]', "SecurePass123!");
      await page.fill('[name="confirmPassword"]', "SecurePass123!");
      await page.click("text=/Create account/i");

      await expect(page.locator("text=/error/i")).toBeVisible();
    });
  });

  test.describe("Security", () => {
    test("should have autocomplete attributes", async ({ page }) => {
      await page.goto("/auth/register");
      
      const emailInput = page.locator('[name="email"]');
      await expect(emailInput).toHaveAttribute("autocomplete", "email");
      
      const passwordInput = page.locator('[name="password"]');
      await expect(passwordInput).toHaveAttribute("autocomplete", "new-password");
      
      const confirmInput = page.locator('[name="confirmPassword"]');
      await expect(confirmInput).toHaveAttribute("autocomplete", "new-password");
    });

    test("should not autofill passwords", async ({ page }) => {
      await page.goto("/auth/register");
      
      const passwordInput = page.locator('[name="password"]');
      const value = await passwordInput.inputValue();
      expect(value).toBe("");
    });
  });
});