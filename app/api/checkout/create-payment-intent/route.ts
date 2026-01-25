// app/api/checkout/create-payment-intent/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { ProductRepository } from "@/repositories/product-repo";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { createCartHash } from "@/lib/utils/crypto";
import { checkoutSessionSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

type CheckoutItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const userEmail = user?.email ?? null;

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "GUEST_CHECKOUT_DISABLED", code: "GUEST_CHECKOUT_DISABLED", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const adminSupabase = createSupabaseAdminClient();
    const ordersSupabase = userId ? supabase : adminSupabase;

    const body = await request.json().catch(() => null);
    const parsed = checkoutSessionSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { items, idempotencyKey, fulfillment, guestEmail, shippingAddress } =
      parsed.data as {
        items: CheckoutItem[];
        idempotencyKey: string;
        fulfillment?: "ship" | "pickup";
        guestEmail?: string | null;
        shippingAddress?: {
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
        } | null;
      };

    if (!userId && !guestEmail) {
      return NextResponse.json(
        { error: "GUEST_EMAIL_REQUIRED", code: "GUEST_EMAIL_REQUIRED", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const normalizedFulfillment = fulfillment === "pickup" ? "pickup" : "ship";
    const cartHash = createCartHash(items, normalizedFulfillment);
    const ordersRepo = new OrdersRepository(ordersSupabase);

    const existingOrder = await ordersRepo.getByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      const expiresAt = existingOrder.expires_at
        ? new Date(existingOrder.expires_at)
        : null;
      if (expiresAt && expiresAt < new Date()) {
        return NextResponse.json(
          {
            error: "IDEMPOTENCY_KEY_EXPIRED",
            code: "IDEMPOTENCY_KEY_EXPIRED",
            requestId,
          },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (existingOrder.cart_hash !== cartHash) {
        return NextResponse.json(
          { error: "CART_MISMATCH", code: "CART_MISMATCH", requestId },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (existingOrder.status === "paid") {
        return NextResponse.json(
          { status: "paid", orderId: existingOrder.id, requestId },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
        await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
      }

      if (existingOrder.stripe_payment_intent_id) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          existingOrder.stripe_payment_intent_id,
        );

        if (paymentIntent.status === "succeeded") {
          return NextResponse.json(
            { status: "paid", orderId: existingOrder.id, requestId },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        if (paymentIntent.status === "canceled") {
          return NextResponse.json(
            {
              error: "PAYMENT_INTENT_CANCELED",
              code: "PAYMENT_INTENT_CANCELED",
              requestId,
            },
            { status: 409, headers: { "Cache-Control": "no-store" } },
          );
        }

        return NextResponse.json(
          {
            clientSecret: paymentIntent.client_secret,
            orderId: existingOrder.id,
            paymentIntentId: paymentIntent.id,
            subtotal: Number(existingOrder.subtotal ?? 0),
            shipping: Number(existingOrder.shipping ?? 0),
            tax: Number(existingOrder.tax_amount ?? 0),
            total: Number(existingOrder.total ?? 0),
            fulfillment: existingOrder.fulfillment ?? normalizedFulfillment,
            requestId,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    // Fetch products
    const productsRepo = new ProductRepository(adminSupabase);
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate single tenant
    const tenantIds = new Set(
      products.map((p) => p.tenantId).filter((id): id is string => Boolean(id)),
    );
    if (tenantIds.size === 0) {
      return NextResponse.json(
        { error: "Products must belong to a tenant", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (tenantIds.size !== 1) {
      return NextResponse.json(
        { error: "All items must be from the same seller", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const [tenantId] = [...tenantIds];

    // Get tenant's Stripe Connect account
    const tenantProfileRepo = new ProfileRepository(adminSupabase);
    const tenantStripeAccountId =
      await tenantProfileRepo.getStripeAccountIdForTenant(tenantId);

    if (!tenantStripeAccountId) {
      log({
        level: "error",
        layer: "api",
        message: "tenant_missing_stripe_account",
        requestId,
        tenantId,
      });
      return NextResponse.json(
        { error: "Seller payment account not configured", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const categories = [...new Set(products.map((p) => p.category))];
    const shippingDefaultsRepo = new ShippingDefaultsRepository(adminSupabase);
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(
      tenantId,
      categories,
    );
    const shippingDefaultsMap = new Map(
      shippingDefaults.map((row) => [row.category, Number(row.shipping_cost_cents ?? 0)]),
    );

    const lineItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new Error("Variant not found");
      }
      if (variant.stock < item.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
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
        category: product.category,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

    let shipping = 0;
    if (normalizedFulfillment === "ship") {
      const shippingCosts = lineItems.map((item) => {
        const costInCents = shippingDefaultsMap.get(item.category) ?? 0;
        return costInCents / 100;
      });
      shipping = Math.max(...shippingCosts, 0);
    }

    // Get tax settings for tenant's Connect account
    const taxSettingsRepo = new TaxSettingsRepository(adminSupabase);
    const taxSettings = await taxSettingsRepo.getByTenant(tenantId);
    const homeState = (taxSettings?.home_state ?? "SC").trim().toUpperCase();
    const taxEnabled = taxSettings?.tax_enabled ?? false;
    const taxCodeOverrides =
      taxSettings?.tax_code_overrides &&
      typeof taxSettings.tax_code_overrides === "object"
        ? (taxSettings.tax_code_overrides as Record<string, string>)
        : {};

    // Calculate tax using tenant's Stripe Connect account
    const taxService = new StripeTaxService(adminSupabase, tenantStripeAccountId);
    const destinationState =
      normalizedFulfillment === "pickup"
        ? homeState
        : (shippingAddress?.state?.trim().toUpperCase() ?? null);

    const stripeRegistrations =
      taxEnabled && destinationState
        ? await taxService.getStripeRegistrations()
        : new Map<string, { id: string; state: string; active: boolean }>();

    let customerAddress: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null = null;

    if (normalizedFulfillment === "ship" && shippingAddress) {
      customerAddress = {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 ?? null,
        city: shippingAddress.city,
        state: shippingAddress.state.trim().toUpperCase(),
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      };
    } else if (normalizedFulfillment === "pickup") {
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

    const hasStripeRegistration =
      taxEnabled && destinationState
        ? (stripeRegistrations.get(destinationState)?.active ?? false)
        : false;

    log({
      level: "info",
      layer: "api",
      message: "tax_calculation_setup",
      requestId,
      tenantId,
      stripeAccountId: tenantStripeAccountId,
      taxEnabled,
      destinationState,
      hasStripeRegistration,
      customerAddress: customerAddress ? "provided" : "null",
    });

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

    log({
      level: "info",
      layer: "api",
      message: "tax_calculated",
      requestId,
      taxAmount: tax,
      taxCalculationId: taxCalc.taxCalculationId,
      subtotal,
      shipping,
      total,
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
        fulfillment: normalizedFulfillment,
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

    const customerState = destinationState ?? null;

    // Update order with tax information
    await adminSupabase
      .from("orders")
      .update({
        tax_amount: tax,
        tax_calculation_id: taxCalc.taxCalculationId,
        customer_state: customerState,
      })
      .eq("id", order.id);

    let stripeCustomerId: string | undefined;
    let receiptEmail: string | undefined;
    if (userId) {
      const profileRepo = new ProfileRepository(supabase);
      const profile = await profileRepo.getByUserId(userId);
      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
      } else if (user?.email) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
        await profileRepo.setStripeCustomerId(userId, stripeCustomerId);
      }
      receiptEmail = userEmail ?? profile?.email ?? undefined;
    }

    // ✅ SIMPLIFIED: Always use automatic payment methods
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(total * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true }, // ✅ Simplified
      customer: stripeCustomerId,
      receipt_email: receiptEmail ?? guestEmail ?? undefined,
      metadata: {
        order_id: order.id,
        cart_hash: cartHash,
        fulfillment: normalizedFulfillment,
        tax_calculation_id: taxCalc.taxCalculationId ?? "",
        tenant_id: tenantId,
      },
      transfer_data: {
        destination: tenantStripeAccountId,
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
      idempotencyKey,
    });

    log({
      level: "info",
      layer: "api",
      message: "payment_intent_created",
      requestId,
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
      tenantId,
      stripeAccountId: tenantStripeAccountId,
      tax,
      taxCalculationId: taxCalc.taxCalculationId,
      customerState,
    });

    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(order.id, paymentIntent.id);
    }

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        subtotal,
        shipping,
        tax,
        total,
        fulfillment: normalizedFulfillment,
        requestId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/create-payment-intent",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create payment intent",
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
