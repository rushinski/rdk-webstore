import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../utils/state";
import { createProductWithVariant } from "../../helpers/fixtures";

test.describe("Storefront filters and duplicates", () => {
  test.beforeEach(async () => {
    const base = await resetAndSeedForE2E();
    await createProductWithVariant({
      tenantId: base.tenantId,
      marketplaceId: base.marketplaceId,
      sku: "SKU-E2E-1",
      stock: 5,
      priceCents: 18000,
    });
  });

  test("filters apply without crashing @smoke", async ({ page }) => {
    await page.goto("/store");
    const panel = page.locator('[data-testid="filter-panel"]');
    if (!(await panel.isVisible())) {
      const openButton = page.locator('[data-testid="filters-open"]');
      await openButton.waitFor();
      await openButton.click();
    } else {
      await panel.waitFor();
    }
    await page.locator('[data-testid="filter-category-sneakers"]').click();
    const grid = page.locator('[data-testid="product-grid"]');
    if (await grid.count()) {
      await grid.waitFor();
      const cards = page.locator('[data-testid="product-card"]');
      if (await cards.count()) {
        await expect(cards.first()).toBeVisible();
      } else {
        await expect(page.getByText("No products found")).toBeVisible();
      }
    } else {
      await expect(page.getByText("No products found")).toBeVisible();
    }
  });

  test("does not render duplicate product cards", async ({ page }) => {
    await page.goto("/store");
    await page.locator('[data-testid="product-grid"]').waitFor();
    const cards = page.locator('[data-testid="product-card"]');
    const ids = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-product-id"))
    );
    const unique = new Set(ids.filter(Boolean));
    expect(unique.size).toBe(ids.filter(Boolean).length);
  });
});
