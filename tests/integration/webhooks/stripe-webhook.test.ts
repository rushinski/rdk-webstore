import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/stripe/route";
import { createAdminClient } from "@/tests/helpers/supabase";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue(createAdminClient()),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn().mockReturnValue(createAdminClient()),
}));

const processCheckoutSessionCompleted = jest.fn();
const processPaymentIntentSucceeded = jest.fn();

jest.mock("@/jobs/stripe-order-job", () => ({
  StripeOrderJob: jest.fn().mockImplementation(() => ({
    processCheckoutSessionCompleted,
    processPaymentIntentSucceeded,
  })),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    processCheckoutSessionCompleted.mockReset();
    processPaymentIntentSucceeded.mockReset();
  });

  it("rejects missing signature", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "payload",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid signature", async () => {
    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "payload",
      headers: { "stripe-signature": "bad" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("dispatches checkout.session.completed to job", async () => {
    const Stripe = require("stripe");
    const stripeInstance = Stripe.mock.instances[0];
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: {} },
    });

    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "payload",
      headers: { "stripe-signature": "ok" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(processCheckoutSessionCompleted).toHaveBeenCalled();
  });
});
