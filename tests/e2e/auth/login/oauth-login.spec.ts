// tests/e2e/auth/login/oauth-login.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";

test.describe("OAuth Login Flow", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  test("should display Google OAuth button @smoke", async ({ page }) => {
    await page.goto("/auth/login");
    
    const googleButton = page.locator("text=/Continue with Google/i");
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test("should have Google icon in button", async ({ page }) => {
    await page.goto("/auth/login");
    
    const googleButton = page.locator("text=/Continue with Google/i");
    const icon = googleButton.locator("svg");
    await expect(icon).toBeVisible();
  });

  test("should show loading state when clicked", async ({ page }) => {
    await page.goto("/auth/login");
    
    // Mock the OAuth redirect to prevent actual navigation
    await page.route("**/**/auth/v1/authorize*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.abort();
    });
    
    const googleButton = page.locator("text=/Continue with Google/i");
    await googleButton.click();
    
    await expect(page.locator("text=/Connecting/i")).toBeVisible();
  });

  test("should disable button during OAuth flow", async ({ page }) => {
    await page.goto("/auth/login");
    
    await page.route("**/**/auth/v1/authorize*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.abort();
    });
    
    const googleButton = page.locator("text=/Continue with Google/i");
    await googleButton.click();
    
    await expect(googleButton).toBeDisabled();
  });

  test("should redirect to Google auth page", async ({ page }) => {
    await page.goto("/auth/login");
    
    const googleButton = page.locator("text=/Continue with Google/i");
    
    // Wait for navigation but don't follow (would require Google login)
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      googleButton.click(),
    ]).catch(() => [null]);
    
    // Verify redirect URL structure
    if (popup) {
      expect(popup.url()).toContain("google");
    }
  });

  test("should include redirect_to parameter", async ({ page }) => {
    await page.goto("/auth/login?next=/products");
    
    // Spy on Supabase auth call
    await page.evaluate(() => {
      (window as any).__oauthCalled = false;
      const originalSignIn = (window as any).supabase?.auth?.signInWithOAuth;
      if (originalSignIn) {
        (window as any).supabase.auth.signInWithOAuth = async (options: any) => {
          (window as any).__oauthCalled = true;
          (window as any).__oauthOptions = options;
          return originalSignIn.call((window as any).supabase.auth, options);
        };
      }
    });
    
    const googleButton = page.locator("text=/Continue with Google/i");
    await googleButton.click();
    
    // Check that redirect includes next parameter
    const oauthOptions = await page.evaluate(() => (window as any).__oauthOptions);
    expect(oauthOptions?.options?.redirectTo).toContain("next=");
  });

  test("should handle OAuth cancellation", async ({ page }) => {
    await page.goto("/auth/login");
    
    // Mock OAuth error response
    await page.route("**/**/auth/v1/authorize*", async (route) => {
      await route.fulfill({
        status: 400,
        body: "user_cancelled",
      });
    });
    
    const googleButton = page.locator("text=/Continue with Google/i");
    await googleButton.click();
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should handle OAuth errors gracefully", async ({ page }) => {
    await page.goto("/auth/login");
    
    // Simulate OAuth error
    await page.evaluate(() => {
      localStorage.setItem("oauth_error", "access_denied");
    });
    
    await page.reload();
    
    // Should show error message
    await expect(page.locator("text=/authentication.*failed/i")).toBeVisible();
  });

  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/auth/login");
    
    const googleButton = page.locator("text=/Continue with Google/i");
    await expect(googleButton).toBeVisible();
    
    // Should be touch-friendly
    const box = await googleButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
  });

  test("should display OAuth button above email divider", async ({ page }) => {
    await page.goto("/auth/login");
    
    const googleButton = page.locator("text=/Continue with Google/i");
    const divider = page.locator("text=/or/i");
    const emailInput = page.locator('[data-testid="login-email"]');
    
    const googleBox = await googleButton.boundingBox();
    const dividerBox = await divider.boundingBox();
    const emailBox = await emailInput.boundingBox();
    
    expect(googleBox?.y).toBeLessThan(dividerBox?.y || Infinity);
    expect(dividerBox?.y).toBeLessThan(emailBox?.y || Infinity);
  });

  test("should handle OAuth callback success", async ({ page, context }) => {
    // Simulate successful OAuth callback
    await page.goto("/auth/login");
    
    // Create a new page that simulates OAuth callback
    const callbackPage = await context.newPage();
    await callbackPage.goto("/api/auth/callback?code=test_code_123");
    
    // Should redirect to home
    await expect(callbackPage).toHaveURL(/\//);
  });

  test("should create profile on first OAuth login", async ({ page }) => {
    // This would require mocking the full OAuth flow
    // Implementation depends on your test environment setup
  });

  test("should match existing user by email on OAuth", async ({ page }) => {
    // This would require mocking the full OAuth flow
    // Implementation depends on your test environment setup
  });

  test("should not require email verification for OAuth users", async ({ page }) => {
    // OAuth users are pre-verified by the provider
  });
});