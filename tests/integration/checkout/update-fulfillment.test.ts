import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkout/update-fulfillment/route";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createAdminClient } from "@/tests/helpers/supabase";
import { createPendingOrder, createProductWithVariant } from "@/tests/helpers/fixtures";
import { OrdersRepository } from "@/repositories/orders-repo";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: jest.fn(),
      update: jest.fn(),
    },
  }));
});

describe("POST /api/checkout/update-fulfillment", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("recalculates totals and updates payment intent", async () => {
    const admin = createAdminClient();
    jest.spyOn(admin.auth, "getUser").mockResolvedValue({ data: { user: null } });
    const { createSupabaseServerClient } = require("@/lib/supabase/server");
    createSupabaseServerClient.mockResolvedValue(admin);

    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-FULFILL-1",
      stock: 5,
      priceCents: 25000,
    });

    const order = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 250,
      fulfillment: "ship",
    });

    const ordersRepo = new OrdersRepository(admin);
    await ordersRepo.updateStripePaymentIntent(order.id, "pi_test");

    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_test",
      status: "requires_payment_method",
    });
    stripeInstance.paymentIntents.update.mockResolvedValue({ id: "pi_test" });

    const req = new NextRequest("http://localhost/api/checkout/update-fulfillment", {
      method: "POST",
      body: JSON.stringify({
        orderId: order.id,
        fulfillment: "pickup",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.shipping).toBe(0);
    expect(body.total).toBeCloseTo(body.subtotal, 2);
    expect(stripeInstance.paymentIntents.update).toHaveBeenCalledWith(
      "pi_test",
      expect.objectContaining({ amount: 25000 })
    );

    const { data: updated } = await admin
      .from("orders")
      .select("fulfillment, shipping, total")
      .eq("id", order.id)
      .single();
    expect(updated?.fulfillment).toBe("pickup");
    expect(Number(updated?.shipping ?? 0)).toBe(0);
  });

  it("rejects updates for already-paid payment intents", async () => {
    const admin = createAdminClient();
    jest.spyOn(admin.auth, "getUser").mockResolvedValue({ data: { user: null } });
    const { createSupabaseServerClient } = require("@/lib/supabase/server");
    createSupabaseServerClient.mockResolvedValue(admin);

    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-FULFILL-2",
      stock: 5,
      priceCents: 19000,
    });

    const order = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 190,
      fulfillment: "ship",
    });

    const ordersRepo = new OrdersRepository(admin);
    await ordersRepo.updateStripePaymentIntent(order.id, "pi_paid");

    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_paid",
      status: "succeeded",
    });

    const req = new NextRequest("http://localhost/api/checkout/update-fulfillment", {
      method: "POST",
      body: JSON.stringify({
        orderId: order.id,
        fulfillment: "pickup",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
