import { OrdersRepository } from "@/repositories/orders-repo";
import { createAdminClient } from "@/tests/helpers/supabase";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createPendingOrder, createProductWithVariant } from "@/tests/helpers/fixtures";

describe("OrdersRepository.markPaidTransactionally", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns false if order already paid", async () => {
    const admin = createAdminClient();
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-PAID",
      stock: 2,
      priceCents: 10000,
    });
    const order = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 100,
    });

    await admin.from("orders").update({ status: "paid" }).eq("id", order.id);

    const repo = new OrdersRepository(admin);
    const result = await repo.markPaidTransactionally(order.id, "pi_paid", [
      { productId, variantId, quantity: 1 },
    ]);

    expect(result).toBe(false);
  });

  it("throws on insufficient stock", async () => {
    const admin = createAdminClient();
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-OOS",
      stock: 0,
      priceCents: 10000,
    });
    const order = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 100,
    });

    const repo = new OrdersRepository(admin);

    await expect(
      repo.markPaidTransactionally(order.id, "pi_fail", [
        { productId, variantId, quantity: 1 },
      ])
    ).rejects.toThrow("Insufficient stock");
  });
});
