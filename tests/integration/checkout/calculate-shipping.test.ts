import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkout/calculate-shipping/route";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createAdminClient } from "@/tests/helpers/supabase";
import { createProductWithVariant } from "@/tests/helpers/fixtures";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue(createAdminClient()),
}));

describe("POST /api/checkout/calculate-shipping", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns max shipping cost across product categories", async () => {
    const { tenantId, marketplaceId } = await seedBaseData();
    const first = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-SHIP-1",
      category: "sneakers",
      priceCents: 15000,
    });
    const second = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-SHIP-2",
      category: "clothing",
      priceCents: 12000,
    });

    const req = new NextRequest("http://localhost/api/checkout/calculate-shipping", {
      method: "POST",
      body: JSON.stringify({
        productIds: [first.productId, second.productId],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.shippingCost).toBe(995);
  });
});
