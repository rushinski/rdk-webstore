import {
  checkoutSessionSchema,
  confirmPaymentSchema,
  shippingAddressSchema,
  updateFulfillmentSchema,
  calculateShippingSchema,
} from "@/lib/validation/checkout";

describe("checkout validation schemas", () => {
  it("rejects invalid checkout session payloads", () => {
    const result = checkoutSessionSchema.safeParse({
      items: [{ productId: "not-uuid", variantId: "x", quantity: 0 }],
      fulfillment: "ship",
      idempotencyKey: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid checkout session payload", () => {
    const result = checkoutSessionSchema.safeParse({
      items: [{ productId: crypto.randomUUID(), variantId: crypto.randomUUID(), quantity: 1 }],
      fulfillment: "ship",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(result.success).toBe(true);
  });

  it("validates shipping address shape", () => {
    const valid = shippingAddressSchema.safeParse({
      name: "Test",
      phone: "5551231234",
      line1: "123 Main St",
      line2: null,
      city: "Austin",
      state: "TX",
      postalCode: "73301",
      country: "US",
    });
    expect(valid.success).toBe(true);

    const invalid = shippingAddressSchema.safeParse({
      name: "",
      phone: "",
      line1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "USA",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates confirm payment payloads", () => {
    const result = confirmPaymentSchema.safeParse({
      orderId: crypto.randomUUID(),
      paymentIntentId: "pi_test",
      fulfillment: "ship",
      shippingAddress: {
        name: "Test",
        phone: "5551231234",
        line1: "123 Main St",
        line2: null,
        city: "Austin",
        state: "TX",
        postalCode: "73301",
        country: "US",
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates fulfillment updates and shipping calc inputs", () => {
    expect(
      updateFulfillmentSchema.safeParse({
        orderId: crypto.randomUUID(),
        fulfillment: "pickup",
      }).success
    ).toBe(true);

    expect(
      calculateShippingSchema.safeParse({
        productIds: [crypto.randomUUID()],
      }).success
    ).toBe(true);
  });
});
