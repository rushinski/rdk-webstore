import { test, expect } from "@playwright/test";
import { resetAndSeedForLocal } from "../utils/state";
import { createProductWithVariant } from "../../helpers/fixtures";

test.describe("Checkout shipping loading", () => {
  test("shows loading indicator while updating fulfillment", async ({ page }) => {
    test.skip(process.env.E2E_MODE === "vercel", "requires local Stripe + seed");

    const base = await resetAndSeedForLocal();
    if (!base) return;
    const { productId, variantId } = await createProductWithVariant({
      tenantId: base.tenantId,
      marketplaceId: base.marketplaceId,
      sku: "SKU-E2E-SHIP",
      stock: 3,
      priceCents: 25000,
    });

    await page.addInitScript(
      ([productId, variantId]) => {
        localStorage.setItem(
          "rdk_cart",
          JSON.stringify([
            {
              productId,
              variantId,
              sizeLabel: "10",
              brand: "Nike",
              name: "Air Test",
              titleDisplay: "Nike Air Test",
              priceCents: 25000,
              imageUrl: "/placeholder.png",
              quantity: 1,
              maxStock: 3,
            },
          ])
        );
      },
      [productId, variantId]
    );

    await page.route("/api/checkout/update-fulfillment", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ subtotal: 250, shipping: 0, total: 250 }),
      });
    });

    await page.goto("/checkout");
    await page.locator('[data-testid="fulfillment-pickup"]').waitFor();
    await page.locator('[data-testid="fulfillment-pickup"]').click();

    const loading = page.locator('[data-testid="shipping-loading"]');
    await expect(loading).toBeVisible();
  });
});
