import { test, expect } from "@playwright/test";

test.describe("Checkout processing page", () => {
  test("renders terminal error state (no infinite spinner) @smoke", async ({ page }) => {
    await page.goto("/checkout/processing?orderId=test-order&e2e_status=error");
    await expect(page.locator('[data-testid="checkout-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
