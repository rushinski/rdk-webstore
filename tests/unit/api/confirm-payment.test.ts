import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkout/confirm-payment/route";
import { OrdersRepository } from "@/repositories/orders-repo";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: jest.fn(),
    },
  }));
});

describe("POST /api/checkout/confirm-payment", () => {
  beforeEach(() => {
    jest.spyOn(OrdersRepository.prototype, "getById").mockResolvedValue({
      id: "order_1",
      status: "pending",
      total: 100,
      currency: "USD",
      stripe_payment_intent_id: null,
      fulfillment: "ship",
    } as any);
    jest.spyOn(OrdersRepository.prototype, "updateStripePaymentIntent").mockResolvedValue();
    jest.spyOn(OrdersRepository.prototype, "getOrderItems").mockResolvedValue([]);
    jest.spyOn(OrdersRepository.prototype, "markPaidTransactionally").mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 202 while processing", async () => {
    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_1",
      status: "processing",
      amount: 10000,
      currency: "usd",
      metadata: { order_id: "order_1" },
    });

    const req = new NextRequest("http://localhost/api/checkout/confirm-payment", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order_1",
        paymentIntentId: "pi_1",
        fulfillment: "ship",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body.processing).toBe(true);
  });

  it("rejects when amount does not match order total", async () => {
    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_2",
      status: "succeeded",
      amount: 9999,
      currency: "usd",
      metadata: { order_id: "order_1" },
    });

    const req = new NextRequest("http://localhost/api/checkout/confirm-payment", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order_1",
        paymentIntentId: "pi_2",
        fulfillment: "ship",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("rejects when status is requires_action", async () => {
    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_3",
      status: "requires_action",
      amount: 10000,
      currency: "usd",
      metadata: { order_id: "order_1" },
    });

    const req = new NextRequest("http://localhost/api/checkout/confirm-payment", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order_1",
        paymentIntentId: "pi_3",
        fulfillment: "ship",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
