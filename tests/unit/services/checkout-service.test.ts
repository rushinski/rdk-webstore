import { CheckoutService } from "@/services/checkout-service";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { ProfileRepository } from "@/repositories/profile-repo";

jest.mock("@/lib/crypto", () => ({
  createCartHash: jest.fn(() => "test-hash"),
  generatePublicToken: jest.fn(() => "public-token"),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: "sess_123", url: "https://stripe.test" }) } },
    customers: { create: jest.fn().mockResolvedValue({ id: "cus_123" }) },
  }));
});

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { email: "buyer@test.com" } } }),
  },
} as any;

describe("CheckoutService", () => {
  beforeEach(() => {
    jest.spyOn(OrdersRepository.prototype, "getByIdempotencyKey").mockResolvedValue(null);
    jest.spyOn(OrdersRepository.prototype, "createPendingOrder").mockResolvedValue({
      id: "order_123",
      stripe_session_id: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      cart_hash: "hash",
      public_token: "pub_123",
      fulfillment: "ship",
    } as any);
    jest.spyOn(OrdersRepository.prototype, "updateStripeSession").mockResolvedValue(undefined);
    jest.spyOn(ProductRepository.prototype, "getProductsForCheckout").mockResolvedValue([
      {
        id: "prod_1",
        name: "Air Test",
        brand: "Nike",
        model: null,
        titleDisplay: "Nike Air Test",
        category: "sneakers",
        tenantId: "tenant_1",
        defaultShippingPrice: 9.95,
        shippingOverrideCents: null,
        variants: [
          { id: "var_1", sizeLabel: "10", priceCents: 20000, costCents: 12000, stock: 2 },
        ],
      },
      {
        id: "prod_2",
        name: "Sweatshirt",
        brand: "Brand",
        model: null,
        titleDisplay: "Brand Sweatshirt",
        category: "clothing",
        tenantId: "tenant_1",
        defaultShippingPrice: 4.95,
        shippingOverrideCents: null,
        variants: [
          { id: "var_2", sizeLabel: "L", priceCents: 5000, costCents: 2000, stock: 5 },
        ],
      },
    ]);
    jest.spyOn(ShippingDefaultsRepository.prototype, "getByCategories").mockResolvedValue([
      { category: "sneakers", shipping_cost_cents: 995 } as any,
      { category: "clothing", shipping_cost_cents: 500 } as any,
    ]);
    jest.spyOn(ProfileRepository.prototype, "getByUserId").mockResolvedValue({
      id: "user_1",
      email: "buyer@test.com",
      stripe_customer_id: null,
    } as any);
    jest.spyOn(ProfileRepository.prototype, "setStripeCustomerId").mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calculates subtotal + max shipping and creates a session", async () => {
    const service = new CheckoutService(mockSupabase);

    const result = await service.createCheckoutSession(
      {
        fulfillment: "ship",
        idempotencyKey: "idem_1",
        items: [
          { productId: "prod_1", variantId: "var_1", quantity: 1 },
          { productId: "prod_2", variantId: "var_2", quantity: 1 },
        ],
      },
      "user_1"
    );

    expect(result.url).toBe("https://stripe.test");
    expect(OrdersRepository.prototype.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 250,
        shipping: 9.95,
        total: 259.95,
        fulfillment: "ship",
      })
    );
  });

  it("throws when stock is insufficient", async () => {
    jest.spyOn(ProductRepository.prototype, "getProductsForCheckout").mockResolvedValue([
      {
        id: "prod_1",
        name: "Air Test",
        brand: "Nike",
        model: null,
        titleDisplay: "Nike Air Test",
        category: "sneakers",
        tenantId: "tenant_1",
        defaultShippingPrice: 9.95,
        shippingOverrideCents: null,
        variants: [
          { id: "var_1", sizeLabel: "10", priceCents: 20000, costCents: 12000, stock: 0 },
        ],
      },
    ]);

    const service = new CheckoutService(mockSupabase);

    await expect(
      service.createCheckoutSession(
        {
          fulfillment: "ship",
          idempotencyKey: "idem_2",
          items: [{ productId: "prod_1", variantId: "var_1", quantity: 1 }],
        },
        null
      )
    ).rejects.toThrow("INSUFFICIENT_STOCK");
  });

  it("returns existing session for valid idempotency key", async () => {
    jest.spyOn(OrdersRepository.prototype, "getByIdempotencyKey").mockResolvedValue({
      id: "order_123",
      stripe_session_id: "sess_existing",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      cart_hash: "test-hash",
    } as any);

    const service = new CheckoutService(mockSupabase);

    const result = await service.createCheckoutSession(
      {
        fulfillment: "ship",
        idempotencyKey: "idem_3",
        items: [{ productId: "prod_1", variantId: "var_1", quantity: 1 }],
      },
      null
    );

    expect(result.stripeSessionId).toBe("sess_existing");
    expect(OrdersRepository.prototype.createPendingOrder).not.toHaveBeenCalled();
  });
});
