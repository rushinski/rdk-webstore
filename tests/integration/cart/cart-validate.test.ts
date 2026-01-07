import { NextRequest } from "next/server";
import { POST } from "@/app/api/cart/validate/route";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createAdminClient } from "@/tests/helpers/supabase";
import { createProductWithVariant } from "@/tests/helpers/fixtures";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue(createAdminClient()),
}));

describe("POST /api/cart/validate", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("removes out-of-stock items", async () => {
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-CART-1",
      stock: 0,
      priceCents: 15000,
    });

    const req = new NextRequest("http://localhost/api/cart/validate", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            productId,
            variantId,
            sizeLabel: "10",
            brand: "Nike",
            name: "Air Test",
            titleDisplay: "Nike Air Test",
            priceCents: 15000,
            imageUrl: "/x.png",
            quantity: 1,
            maxStock: 0,
          },
        ],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.removed).toHaveLength(1);
    expect(body.removed[0].reason).toBe("out_of_stock");
  });
});
