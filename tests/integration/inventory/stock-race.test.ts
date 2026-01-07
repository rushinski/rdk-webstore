import { OrdersRepository } from "@/repositories/orders-repo";
import { createAdminClient } from "@/tests/helpers/supabase";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createPendingOrder, createProductWithVariant } from "@/tests/helpers/fixtures";

describe("inventory race conditions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("allows only one purchase when stock is 1", async () => {
    const admin = createAdminClient();
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-RACE-1",
      stock: 1,
      priceCents: 20000,
    });

    const order1 = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 200,
    });
    const order2 = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 200,
    });

    const repo = new OrdersRepository(admin);

    const results = await Promise.allSettled([
      repo.markPaidTransactionally(order1.id, "pi_race_1", [
        { productId, variantId, quantity: 1 },
      ]),
      repo.markPaidTransactionally(order2.id, "pi_race_2", [
        { productId, variantId, quantity: 1 },
      ]),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled" && r.value === true);
    const failures = results.filter((r) => r.status === "rejected");
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const { data: variantRow } = await admin
      .from("product_variants")
      .select("stock")
      .eq("id", variantId)
      .single();

    const { data: paidOrders } = await admin
      .from("orders")
      .select("id")
      .eq("status", "paid");

    expect(variantRow?.stock).toBe(0);
    expect(paidOrders ?? []).toHaveLength(1);
  });
});
