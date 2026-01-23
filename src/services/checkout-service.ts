// src/services/checkout-service.ts (FIXED)

import Stripe from "stripe";

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { env } from "@/config/env";
import { createCartHash } from "@/lib/crypto";
import type {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
} from "@/types/domain/checkout";
import { checkoutSessionSchema } from "@/lib/validation/checkout";
import { log } from "@/lib/log";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export class CheckoutService {
  private ordersRepo: OrdersRepository;
  private productsRepo: ProductRepository;
  private profilesRepo: ProfileRepository;
  private shippingDefaultsRepo: ShippingDefaultsRepository;
  private adminOrdersRepo: OrdersRepository | null;
  private adminProductsRepo: ProductRepository | null;
  private adminShippingDefaultsRepo: ShippingDefaultsRepository | null;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    private readonly adminSupabase?: AdminSupabaseClient,
  ) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.productsRepo = new ProductRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
    this.shippingDefaultsRepo = new ShippingDefaultsRepository(supabase);
    this.adminOrdersRepo = adminSupabase ? new OrdersRepository(adminSupabase) : null;
    this.adminProductsRepo = adminSupabase ? new ProductRepository(adminSupabase) : null;
    this.adminShippingDefaultsRepo = adminSupabase
      ? new ShippingDefaultsRepository(adminSupabase)
      : null;
  }

  async createCheckoutSession(
    request: CheckoutSessionRequest,
    userId: string | null,
  ): Promise<CheckoutSessionResponse> {
    // Validate input
    const validated = checkoutSessionSchema.parse(request);
    const { items, fulfillment, idempotencyKey, guestEmail } = validated;

    if (!userId && !guestEmail) {
      throw new Error("GUEST_EMAIL_REQUIRED");
    }

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      throw new Error("GUEST_CHECKOUT_DISABLED");
    }

    const ordersRepo = userId
      ? this.ordersRepo
      : (this.adminOrdersRepo ?? this.ordersRepo);
    const productsRepo = this.adminProductsRepo ?? this.productsRepo;
    const shippingDefaultsRepo =
      this.adminShippingDefaultsRepo ?? this.shippingDefaultsRepo;

    // Fetch product data
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      throw new Error("No valid products found");
    }

    // Build product map
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate single tenant
    const tenantIds = new Set(
      products
        .map((product) => product.tenantId)
        .filter((id): id is string => Boolean(id)),
    );
    if (tenantIds.size !== 1) {
      throw new Error("Checkout requires a single tenant");
    }
    const [tenantId] = [...tenantIds];

    // ✅ Get tenant's Stripe Connect account
    const adminSupabase = this.adminSupabase ?? this.supabase;
    const tenantProfileRepo = new ProfileRepository(adminSupabase);
    const tenantStripeAccountId =
      await tenantProfileRepo.getStripeAccountIdForTenant(tenantId);

    if (!tenantStripeAccountId) {
      throw new Error("Seller payment account not configured");
    }

    // Get categories and shipping defaults
    const categories = [...new Set(products.map((p) => p.category))];
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(
      tenantId,
      categories,
    );
    const shippingDefaultsMap = new Map(
      shippingDefaults.map((row) => [row.category, Number(row.shipping_cost_cents ?? 0)]),
    );

    // Build line items
    const lineItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new Error(`Variant not found: ${item.variantId}`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(
          `INSUFFICIENT_STOCK: ${product.titleDisplay} (${variant.sizeLabel})`,
        );
      }

      const unitPrice = Number(variant.priceCents ?? 0) / 100;
      const unitCost = Number(variant.costCents ?? 0) / 100;
      const lineTotal = unitPrice * item.quantity;

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        lineTotal,
        titleDisplay: product.titleDisplay,
        brand: product.brand,
        name: product.name,
        category: product.category,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // Calculate shipping: max of all product shipping costs (flat rate approach)
    let shipping = 0;
    if (fulfillment === "ship") {
      const shippingCosts = lineItems.map((item) => {
        const costInCents = shippingDefaultsMap.get(item.category) ?? 0;
        return costInCents / 100;
      });
      shipping = Math.max(...shippingCosts, 0);
    }

    // ✅ Calculate tax using tenant's Stripe Connect account
    const taxSettingsRepo = new TaxSettingsRepository(adminSupabase);
    const taxSettings = await taxSettingsRepo.getByTenant(tenantId);
    const homeState = (taxSettings?.home_state ?? "SC").trim().toUpperCase();
    const taxEnabled = taxSettings?.tax_enabled ?? false;
    const taxCodeOverrides =
      taxSettings?.tax_code_overrides &&
      typeof taxSettings.tax_code_overrides === "object"
        ? (taxSettings.tax_code_overrides as Record<string, string>)
        : {};

    const taxService = new StripeTaxService(adminSupabase, tenantStripeAccountId);

    // For Stripe Checkout, we'll use pickup address (head office) initially
    // Actual address will be collected during checkout
    let customerAddress: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null = null;

    if (fulfillment === "pickup") {
      const officeAddress = await taxService.getHeadOfficeAddress();
      if (officeAddress) {
        customerAddress = officeAddress;
      } else {
        customerAddress = {
          line1: "123 Main St",
          city: "Charleston",
          state: homeState,
          postal_code: "29401",
          country: "US",
        };
      }
    }

    const destinationState = fulfillment === "pickup" ? homeState : null;
    const stripeRegistrations =
      taxEnabled && destinationState
        ? await taxService.getStripeRegistrations()
        : new Map<string, { id: string; state: string; active: boolean }>();

    const hasStripeRegistration =
      taxEnabled && destinationState
        ? (stripeRegistrations.get(destinationState)?.active ?? false)
        : false;

    // For shipping, we can't calculate exact tax yet, but we can estimate
    const taxCalc =
      hasStripeRegistration && customerAddress
        ? await taxService.calculateTax({
            currency: "usd",
            customerAddress,
            lineItems: lineItems.map((item) => ({
              amount: Math.round(item.unitPrice * 100),
              quantity: item.quantity,
              productId: item.productId,
              category: item.category,
            })),
            shippingCost: Math.round(shipping * 100),
            taxCodes: taxCodeOverrides,
            taxEnabled,
          })
        : {
            taxAmount: 0,
            totalAmount: Math.round((subtotal + shipping) * 100),
            taxCalculationId: null,
          };

    const tax = taxCalc.taxAmount / 100;
    const total = subtotal + shipping + tax;

    // Create cart hash for idempotency
    const cartHash = createCartHash(items, fulfillment);

    // Check for existing order with this idempotency key
    const existingOrder = await ordersRepo.getByIdempotencyKey(idempotencyKey);

    if (existingOrder) {
      // Check if expired
      const expiresAt = new Date(existingOrder.expires_at!);
      if (expiresAt < new Date()) {
        throw new Error("IDEMPOTENCY_KEY_EXPIRED");
      }

      // Check if cart hash matches
      if (existingOrder.cart_hash !== cartHash) {
        throw new Error("CART_MISMATCH");
      }

      // Return existing session
      if (existingOrder.stripe_session_id) {
        if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
          await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
        }
        return {
          url: `https://checkout.stripe.com/pay/${existingOrder.stripe_session_id}`,
          orderId: existingOrder.id,
          stripeSessionId: existingOrder.stripe_session_id,
        };
      }
    }

    // Create pending order
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const order =
      existingOrder ??
      (await ordersRepo.createPendingOrder({
        userId,
        guestEmail: guestEmail ?? null,
        tenantId,
        currency: "USD",
        subtotal,
        shipping,
        total,
        fulfillment,
        idempotencyKey,
        cartHash,
        expiresAt,
        items: lineItems.map((li) => ({
          productId: li.productId,
          variantId: li.variantId,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          unitCost: li.unitCost,
          lineTotal: li.lineTotal,
        })),
      }));

    if (existingOrder && !order.user_id && guestEmail && !order.guest_email) {
      await ordersRepo.updateGuestEmail(order.id, guestEmail);
    }

    // ✅ Update order with tax information
    await adminSupabase
      .from("orders")
      .update({
        tax_amount: tax,
        tax_calculation_id: taxCalc.taxCalculationId,
        customer_state: destinationState,
      })
      .eq("id", order.id);

    log({
      level: "info",
      layer: "service",
      message: "order_created",
      orderId: order.id,
      subtotal,
      shipping,
      tax,
      total,
      fulfillment,
      taxCalculationId: taxCalc.taxCalculationId,
    });

    // Get or create Stripe customer for signed-in users
    let stripeCustomerId: string | undefined;
    if (userId) {
      const profile = await this.profilesRepo.getByUserId(userId);
      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
      } else {
        const { data: userData } = await this.supabase.auth.getUser();
        if (userData?.user?.email) {
          const customer = await stripe.customers.create({
            email: userData.user.email,
            metadata: { userId },
          });
          stripeCustomerId = customer.id;
          await this.profilesRepo.setStripeCustomerId(userId, stripeCustomerId);
        }
      }
    }

    // Build success/cancel URLs
    const siteUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const successUrl = `${siteUrl}/checkout/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/checkout/cancel`;

    // ✅ Create Stripe Checkout Session on tenant's Connect account
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems.map((li) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: li.titleDisplay || `${li.brand} ${li.name}`,
          },
          unit_amount: Math.round(li.unitPrice * 100),
        },
        quantity: li.quantity,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_id: order.id,
        fulfillment,
        cart_hash: cartHash,
        tenant_id: tenantId,
        tax_calculation_id: taxCalc.taxCalculationId ?? "", // ✅ Include tax ID
      },
      // ✅ Use tenant's Connect account
      payment_intent_data: {
        transfer_data: {
          destination: tenantStripeAccountId,
        },
        metadata: {
          order_id: order.id,
          tenant_id: tenantId,
          tax_calculation_id: taxCalc.taxCalculationId ?? "",
        },
      },
    };

    // Add customer or customer_email
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else {
      const { data: userData } = await this.supabase.auth.getUser();
      const fallbackEmail = userData?.user?.email ?? guestEmail ?? null;
      if (fallbackEmail) {
        sessionParams.customer_email = fallbackEmail;
      }
    }

    // Add shipping for "ship" fulfillment
    if (fulfillment === "ship") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["US"],
      };
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(shipping * 100),
              currency: "usd",
            },
            display_name: "Standard Shipping",
          },
        },
      ];

      // ✅ Enable automatic tax for shipping checkouts
      if (taxEnabled) {
        sessionParams.automatic_tax = {
          enabled: true,
        };
      }
    }

    // Create Stripe session with idempotency
    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey,
    });

    // Update order with Stripe session ID
    await ordersRepo.updateStripeSession(order.id, session.id);

    log({
      level: "info",
      layer: "service",
      message: "stripe_session_created",
      orderId: order.id,
      stripeSessionId: session.id,
      tenantId,
      stripeAccountId: tenantStripeAccountId,
      automaticTax: fulfillment === "ship" && taxEnabled,
    });

    return {
      url: session.url!,
      orderId: order.id,
      stripeSessionId: session.id,
    };
  }
}
