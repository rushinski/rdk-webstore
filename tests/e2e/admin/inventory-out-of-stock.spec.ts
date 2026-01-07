import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../utils/state";
import { createUserWithProfile, createAdminClient } from "../../helpers/supabase";
import { createProductWithVariant } from "../../helpers/fixtures";

test.describe("Inventory out-of-stock transitions", () => {
  test("moves product into out-of-stock filter after depletion", async ({ page }) => {

    const base = await resetAndSeedForE2E();

    await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      tenantId: base.tenantId,
    });

    const { productId, variantId } = await createProductWithVariant({
      tenantId: base.tenantId,
      marketplaceId: base.marketplaceId,
      sku: "SKU-INV-1",
      stock: 1,
      priceCents: 15000,
    });

    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/admin/);

    await page.goto("/admin/inventory");
    const row = page.locator(`[data-testid="inventory-row"][data-product-id="${productId}"]`);
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeVisible();

    const admin = createAdminClient();
    await admin.from("product_variants").update({ stock: 0 }).eq("id", variantId);

    await page.click('[data-testid="inventory-filter-out-of-stock"]');
    const outRow = page.locator(`[data-testid="inventory-row"][data-product-id="${productId}"]`);
    await outRow.scrollIntoViewIfNeeded();
    await expect(outRow).toBeVisible();
  });
});
