import { test, expect } from "@playwright/test";

test.describe("2FA QR copy", () => {
  test("copies QR setup info @smoke", async ({ page }) => {
    await page.goto("/auth/2fa/setup?e2e_qr=1");
    const button = page.locator('[data-testid="qr-copy-button"]');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveText(/Copied/i);
  });
});
