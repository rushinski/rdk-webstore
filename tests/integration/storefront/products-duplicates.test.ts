import { ProductRepository } from "@/repositories/product-repo";
import { createAdminClient } from "@/tests/helpers/supabase";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";

describe("storefront duplicates regression", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("does not return duplicate products when sorting by price", async () => {
    const admin = createAdminClient();
    const { tenantId, marketplaceId } = await seedBaseData();

    const { data: product } = await admin
      .from("products")
      .insert({
        tenant_id: tenantId,
        marketplace_id: marketplaceId,
        sku: "SKU-DUPE-1",
        category: "sneakers",
        brand: "Nike",
        name: "Air Test",
        condition: "new",
        title_raw: "Nike Air Test",
        title_display: "Nike Air Test",
        is_active: true,
        is_out_of_stock: false,
        cost_cents: 10000,
      })
      .select("id")
      .single();

    await admin.from("product_variants").insert([
      {
        product_id: product?.id,
        size_type: "shoe",
        size_label: "9",
        price_cents: 20000,
        stock: 5,
      },
      {
        product_id: product?.id,
        size_type: "shoe",
        size_label: "10",
        price_cents: 21000,
        stock: 5,
      },
    ]);

    const repo = new ProductRepository(admin);
    const result = await repo.list({ sort: "price_asc", limit: 20, page: 1 });

    const ids = result.products.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
