import { test, expect } from "@playwright/test";
import { resetAndSeedForLocal } from "../utils/state";
import { createProductWithVariant } from "../../helpers/fixtures";
import { createAdminClient } from "../../helpers/supabase";

test.describe("Cart invalidation", () => {
  test("removes items when stock drops to zero", async ({ request }) => {
    test.skip(process.env.E2E_MODE === "vercel", "local-only mutation");

    const base = await resetAndSeedForLocal();
    if (!base) return;
    const { productId, variantId } = await createProductWithVariant({
      tenantId: base.tenantId,
      marketplaceId: base.marketplaceId,
      sku: "SKU-E2E-CART",
      stock: 1,
      priceCents: 12000,
    });

    const payload = {
      items: [
        {
          productId,
          variantId,
          sizeLabel: "10",
          brand: "Nike",
          name: "Air Test",
          titleDisplay: "Nike Air Test",
          priceCents: 12000,
          imageUrl: "/placeholder.png",
          quantity: 1,
          maxStock: 1,
        },
      ],
    };

    const initial = await request.post("/api/cart/validate", { data: payload });
    const initialBody = await initial.json();
    expect(initialBody.items).toHaveLength(1);

    const admin = createAdminClient();
    await admin.from("product_variants").update({ stock: 0 }).eq("id", variantId);

    const after = await request.post("/api/cart/validate", { data: payload });
    const afterBody = await after.json();
    expect(afterBody.items).toHaveLength(0);
    expect(afterBody.removed[0].reason).toBe("out_of_stock");
  });
});
