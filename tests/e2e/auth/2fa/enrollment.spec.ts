// tests/e2e/auth/2fa/enrollment.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../utils/state";
import { createUserWithProfile } from "../../../helpers/supabase";

test.describe("2FA Enrollment", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
    await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
    });
  });

  test("should display QR code @smoke", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    await expect(page.locator("text=/Set up 2FA/i")).toBeVisible();
    await expect(page.locator("img[alt*='QR']")).toBeVisible();
  });

  test("should show manual setup key", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    await expect(page.locator("text=/Manual setup key/i")).toBeVisible();
    await expect(page.locator('[data-testid="manual-secret-field"]')).toBeVisible();
  });

  test("should copy manual key on click", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    const manualKeyField = page.locator('[data-testid="manual-secret-field"]');
    await manualKeyField.click();
    
    await expect(page.locator("text=/Copied/i")).toBeVisible();
  });

  test("should verify enrollment code", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    await page.route("/api/auth/2fa/verify-enrollment", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.fill('[data-testid="enroll-code"]', "123456");
    await page.click("text=/Verify.*continue/i");

    await expect(page).toHaveURL(/\/admin/);
  });

  test("should show error for invalid code", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    await page.route("/api/auth/2fa/verify-enrollment", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ 
          ok: false, 
          error: "Invalid code" 
        }),
      });
    });

    await page.fill('[data-testid="enroll-code"]', "999999");
    await page.click("text=/Verify.*continue/i");

    await expect(page.locator("text=/Invalid code/i")).toBeVisible();
  });

  test("should disable submit until code is complete", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    const submitButton = page.locator("text=/Verify.*continue/i");
    await expect(submitButton).toBeDisabled();
    
    await page.fill('[data-testid="enroll-code"]', "123456");
    await expect(submitButton).toBeEnabled();
  });

  test("should generate new QR code", async ({ page }) => {
    await page.goto("/auth/2fa/setup");
    
    await page.route("/api/auth/2fa/enroll", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          factorId: "test-factor",
          qrCode: "data:image/svg+xml;base64,test",
          uri: "otpauth://totp/test",
        }),
      });
    });

    await page.click("text=/Generate QR code/i");
    
    await expect(page.locator("img[alt*='QR']")).toBeVisible();
  });

  test("should navigate back to login", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    
    await page.click("text=/Back to sign in/i");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});