import { StripeOrderJob } from "@/jobs/stripe-order-job";
import { createAdminClient } from "@/tests/helpers/supabase";
import { resetDatabase, seedBaseData } from "@/tests/helpers/db";
import { createPendingOrder, createProductWithVariant } from "@/tests/helpers/fixtures";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

jest.mock("@/services/product-service", () => ({
  ProductService: jest.fn().mockImplementation(() => ({
    syncSizeTags: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@/services/order-email-service", () => ({
  OrderEmailService: jest.fn().mockImplementation(() => ({
    sendOrderConfirmation: jest.fn().mockRejectedValue(new Error("Email failed")),
  })),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "cs_test",
          payment_intent: "pi_test",
          customer_details: { email: "buyer@test.com" },
          collected_information: {
            shipping_details: {
              name: "Buyer",
              address: {
                line1: "123 Test St",
                city: "Austin",
                state: "TX",
                postal_code: "73301",
                country: "US",
              },
            },
          },
        }),
      },
    },
  }));
});

describe("StripeOrderJob", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("marks paid, decrements stock, and records idempotency even if email fails", async () => {
    const admin = createAdminClient();
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-TEST-1",
      stock: 2,
      priceCents: 20000,
    });
    const order = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 200,
    });

    const job = new StripeOrderJob(admin);
    const event = {
      id: "evt_test_1",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "cs_test",
          payment_intent: "pi_test",
          metadata: { order_id: order.id },
          customer_details: { email: "buyer@test.com" },
        },
      },
    } as any;

    await job.processCheckoutSessionCompleted(event, "req_test_1");

    const { data: orderRow } = await admin
      .from("orders")
      .select("status, stripe_payment_intent_id")
      .eq("id", order.id)
      .single();

    const { data: variantRow } = await admin
      .from("product_variants")
      .select("stock")
      .eq("id", variantId)
      .single();

    const { data: eventRow } = await admin
      .from("stripe_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", "evt_test_1")
      .maybeSingle();

    expect(orderRow?.status).toBe("paid");
    expect(orderRow?.stripe_payment_intent_id).toBe("pi_test");
    expect(variantRow?.stock).toBe(1);
    expect(eventRow?.stripe_event_id).toBe("evt_test_1");
  });

  it("is idempotent and does not double-decrement stock", async () => {
    const admin = createAdminClient();
    const { tenantId, marketplaceId } = await seedBaseData();
    const { productId, variantId } = await createProductWithVariant({
      tenantId,
      marketplaceId,
      sku: "SKU-TEST-2",
      stock: 2,
      priceCents: 20000,
    });
    const order = await createPendingOrder({
      tenantId,
      productId,
      variantId,
      quantity: 1,
      unitPrice: 200,
    });

    const job = new StripeOrderJob(admin);
    const event = {
      id: "evt_test_2",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: "cs_test", payment_intent: "pi_test", metadata: { order_id: order.id } } },
    } as any;

    await job.processCheckoutSessionCompleted(event, "req_test_2");
    await job.processCheckoutSessionCompleted(event, "req_test_2_repeat");

    const { data: variantRow } = await admin
      .from("product_variants")
      .select("stock")
      .eq("id", variantId)
      .single();

    const { data: events } = await admin
      .from("stripe_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", "evt_test_2");

    expect(variantRow?.stock).toBe(1);
    expect(events?.length).toBe(1);
  });
});
