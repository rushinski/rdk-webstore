import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createUserWithProfile, signInUser } from "@/tests/helpers/supabase";
import { createPendingOrder, createProductWithVariant } from "@/tests/helpers/fixtures";

describe("RLS: orders visibility", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("allows customers to see only their own orders", async () => {
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-RLS-1",
      stock: 5,
      priceCents: 15000,
    });

    const user1 = await createUserWithProfile({
      email: "user1@test.com",
      password: "Password123!",
      role: "customer",
      tenantId,
    });
    const user2 = await createUserWithProfile({
      email: "user2@test.com",
      password: "Password123!",
      role: "customer",
      tenantId,
    });

    const order1 = await createPendingOrder({
      userId: user1.id,
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 150,
    });
    const order2 = await createPendingOrder({
      userId: user2.id,
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 150,
    });

    const session1 = await signInUser("user1@test.com", "Password123!");
    const session2 = await signInUser("user2@test.com", "Password123!");

    const { data: orders1 } = await session1.client.from("orders").select("id");
    const { data: orders2 } = await session2.client.from("orders").select("id");

    const ids1 = (orders1 ?? []).map((row) => row.id);
    const ids2 = (orders2 ?? []).map((row) => row.id);

    expect(ids1).toContain(order1.id);
    expect(ids1).not.toContain(order2.id);
    expect(ids2).toContain(order2.id);
    expect(ids2).not.toContain(order1.id);
  });
});
