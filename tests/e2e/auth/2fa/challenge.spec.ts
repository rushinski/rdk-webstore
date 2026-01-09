// tests/e2e/auth/2fa/challenge.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";

test.describe("2FA Challenge", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  test("should display challenge form @smoke", async ({ page }) => {
    await page.goto("/auth/2fa/challenge");
    
    await expect(page.locator("text=/Verify your identity/i")).toBeVisible();
    await expect(page.locator("text=/authenticator app/i")).toBeVisible();
  });

  test("should verify challenge code", async ({ page }) => {
    await page.goto("/auth/2fa/challenge");
    
    await page.route("/api/auth/2fa/challenge/start", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          factorId: "test-factor",
          challengeId: "test-challenge",
        }),
      });
    });

    await page.route("/api/auth/2fa/challenge/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, isAdmin: true }),
      });
    });

    await page.fill('[data-testid="mfa-code"]', "123456");
    await page.click("text=/Verify/i");

    await expect(page).toHaveURL(/\/admin/);
  });

  test("should show error for invalid code", async ({ page }) => {
    await page.goto("/auth/2fa/challenge");
    
    await page.route("/api/auth/2fa/challenge/start", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          factorId: "test-factor",
          challengeId: "test-challenge",
        }),
      });
    });

    await page.route("/api/auth/2fa/challenge/verify", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ 
          ok: false, 
          error: "Invalid code" 
        }),
      });
    });

    await page.fill('[data-testid="mfa-code"]', "999999");
    await page.click("text=/Verify/i");

    await expect(page.locator("text=/Invalid code/i")).toBeVisible();
  });

  test("should show loading during initialization", async ({ page }) => {
    await page.goto("/auth/2fa/challenge");
    
    await page.route("/api/auth/2fa/challenge/start", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          factorId: "test-factor",
          challengeId: "test-challenge",
        }),
      });
    });

    await expect(page.locator("text=/Preparing verification/i")).toBeVisible();
  });

  test("should disable form during initialization", async ({ page }) => {
    await page.goto("/auth/2fa/challenge");
    
    const codeInput = page.locator('[data-testid="mfa-code"]');
    await expect(codeInput).toBeDisabled();
  });
});