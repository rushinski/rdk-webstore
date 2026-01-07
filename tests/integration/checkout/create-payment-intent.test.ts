import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkout/create-payment-intent/route";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createAdminClient } from "@/tests/helpers/supabase";
import { createProductWithVariant } from "@/tests/helpers/fixtures";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
  }));
});

describe("POST /api/checkout/create-payment-intent", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates order + payment intent from server-side totals", async () => {
    const admin = createAdminClient();
    jest.spyOn(admin.auth, "getUser").mockResolvedValue({ data: { user: null } });
    const { createSupabaseServerClient } = require("@/lib/supabase/server");
    createSupabaseServerClient.mockResolvedValue(admin);

    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-INTENT-1",
      stock: 5,
      priceCents: 20000,
    });

    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.create.mockResolvedValue({
      id: "pi_test",
      client_secret: "cs_test",
    });

    const req = new NextRequest("http://localhost/api/checkout/create-payment-intent", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        fulfillment: "ship",
        items: [{ productId, variantId, quantity: 1 }],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subtotal).toBeCloseTo(200, 2);
    expect(body.shipping).toBeCloseTo(9.95, 2);
    expect(body.total).toBeCloseTo(209.95, 2);
    expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 20995, currency: "usd" }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );

    const { data: order } = await admin
      .from("orders")
      .select("id, total, status")
      .eq("id", body.orderId)
      .single();
    expect(order?.status).toBe("pending");
    expect(Number(order?.total ?? 0)).toBeCloseTo(209.95, 2);
  });

  it("rejects when idempotency key is reused with a different cart", async () => {
    const admin = createAdminClient();
    jest.spyOn(admin.auth, "getUser").mockResolvedValue({ data: { user: null } });
    const { createSupabaseServerClient } = require("@/lib/supabase/server");
    createSupabaseServerClient.mockResolvedValue(admin);

    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-INTENT-2",
      stock: 5,
      priceCents: 15000,
    });

    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.create.mockResolvedValue({
      id: "pi_test",
      client_secret: "cs_test",
    });

    const idempotencyKey = crypto.randomUUID();

    const firstReq = new NextRequest("http://localhost/api/checkout/create-payment-intent", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey,
        fulfillment: "ship",
        items: [{ productId, variantId, quantity: 1 }],
      }),
      headers: { "content-type": "application/json" },
    });
    await POST(firstReq);

    const secondReq = new NextRequest("http://localhost/api/checkout/create-payment-intent", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey,
        fulfillment: "ship",
        items: [{ productId, variantId, quantity: 2 }],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(secondReq);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe("CART_MISMATCH");
  });
});
