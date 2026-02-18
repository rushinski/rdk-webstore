// src/app/api/checkout/create-payment-intent/route.ts
//
// KEY CHANGES:
// 1. DIRECT CHARGES: PaymentIntent is created on the Connect account
// 2. DEFERRED ORDER: We still create a "pending" order row for idempotency,
//    but the order is only marked "paid" when payment actually succeeds.
//    We'll also add a cleanup job for expired pending orders.
// 3. No more transfer_data — the platform never touches the money.
// 4. The client must use the stripeAccountId to initialize Stripe Elements
//    (this is how direct charges work on the frontend).

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import {
  CheckoutPricingService,
  CheckoutError,
} from "@/services/checkout-pricing-service";
import { StripeDirectChargeService } from "@/services/stripe-direct-charge-service";
import { createCartHash } from "@/lib/utils/crypto";
import { createPaymentIntentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";

const directCharge = new StripeDirectChargeService();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    // Auth
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const userEmail = user?.email ?? null;

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      return json(
        { error: "GUEST_CHECKOUT_DISABLED", code: "GUEST_CHECKOUT_DISABLED", requestId },
        403,
      );
    }

    // Parse & validate
    const body = await request.json().catch(() => null);
    const parsed = createPaymentIntentSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        400,
      );
    }

    const { items, fulfillment, idempotencyKey, guestEmail, shippingAddress } =
      parsed.data;
    const adminSupabase = createSupabaseAdminClient();
    const ordersRepo = new OrdersRepository(userId ? supabase : adminSupabase);
    const cartHash = createCartHash(items, fulfillment);

    // ---------- Idempotency: check existing order ----------
    const existingOrder = await ordersRepo.getByIdempotencyKey(idempotencyKey);

    if (existingOrder) {
      const expiresAt = existingOrder.expires_at
        ? new Date(existingOrder.expires_at)
        : null;
      if (expiresAt && expiresAt < new Date()) {
        return json(
          {
            error: "IDEMPOTENCY_KEY_EXPIRED",
            code: "IDEMPOTENCY_KEY_EXPIRED",
            requestId,
          },
          409,
        );
      }
      if (existingOrder.cart_hash !== cartHash) {
        return json({ error: "CART_MISMATCH", code: "CART_MISMATCH", requestId }, 409);
      }
      if (existingOrder.status === "paid") {
        return json({ status: "paid", orderId: existingOrder.id, requestId }, 200);
      }

      // Update guest email if provided
      if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
        await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
      }

      // Return existing payment intent if still valid
      if (existingOrder.stripe_payment_intent_id && existingOrder.tenant_id) {
        const profileRepo = new ProfileRepository(adminSupabase);
        const stripeAccountId = await profileRepo.getStripeAccountIdForTenant(
          existingOrder.tenant_id,
        );

        if (stripeAccountId) {
          try {
            const pi = await directCharge.retrievePaymentIntent(
              stripeAccountId,
              existingOrder.stripe_payment_intent_id,
            );

            if (pi.status === "succeeded") {
              return json({ status: "paid", orderId: existingOrder.id, requestId }, 200);
            }
            if (pi.status === "canceled") {
              return json(
                {
                  error: "PAYMENT_INTENT_CANCELED",
                  code: "PAYMENT_INTENT_CANCELED",
                  requestId,
                },
                409,
              );
            }

            return json(
              {
                clientSecret: pi.client_secret,
                orderId: existingOrder.id,
                paymentIntentId: pi.id,
                stripeAccountId, // Client needs this for Elements
                subtotal: Number(existingOrder.subtotal ?? 0),
                shipping: Number(existingOrder.shipping ?? 0),
                tax: Number(existingOrder.tax_amount ?? 0),
                total: Number(existingOrder.total ?? 0),
                fulfillment: existingOrder.fulfillment ?? fulfillment,
                requestId,
              },
              200,
            );
          } catch {
            // Payment intent may have been invalidated; fall through to create new one
          }
        }
      }
    }

    // ---------- Resolve pricing ----------
    const pricingService = new CheckoutPricingService(adminSupabase);
    const resolved = await pricingService.resolve({
      items,
      fulfillment,
      shippingAddress,
    });
    const { tenantId, stripeAccountId, lineItems, pricing } = resolved;

    // ---------- Create pending order ----------
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const order =
      existingOrder ??
      (await ordersRepo.createPendingOrder({
        userId,
        guestEmail: guestEmail ?? null,
        tenantId,
        currency: "USD",
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        total: pricing.total,
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

    // Update tax info
    await adminSupabase
      .from("orders")
      .update({
        tax_amount: pricing.tax,
        tax_calculation_id: pricing.taxCalculationId,
        customer_state: pricing.customerState,
      })
      .eq("id", order.id);

    // ---------- Resolve customer email ----------
    const email = userEmail ?? guestEmail ?? null;

    // DISABLED: Customer creation causes saved payment methods to be reused with old billing details
    // This breaks Stripe Radar postal code verification since the saved payment methods
    // have outdated billing information that can't be updated before authorization.
    // By not creating customers, we force fresh payment methods with current billing details.
    //
    // Optionally create a customer on the Connect account for signed-in users
    let connectCustomerId: string | undefined;
    // if (userId && email) {
    //   try {
    //     connectCustomerId = await directCharge.getOrCreateConnectCustomer(
    //       stripeAccountId,
    //       { email, metadata: { platform_user_id: userId } },
    //     );
    //   } catch (err) {
    //     // Non-fatal — proceed without customer
    //     log({
    //       level: "warn",
    //       layer: "api",
    //       message: "connect_customer_create_failed",
    //       requestId,
    //       error: err instanceof Error ? err.message : String(err),
    //     });
    //   }
    // }

    // ---------- Register payment method domain on Connect account ----------
    // Required for Apple Pay / Google Pay to appear in ExpressCheckoutElement
    // with direct charges. Must use paymentMethodDomains (not legacy applePayDomains).
    // Awaited so the domain is registered before the client loads Elements.
    const siteUrl = env.NEXT_PUBLIC_SITE_URL;
    try {
      const domain = new URL(siteUrl).hostname;
      await directCharge.registerPaymentMethodDomain(stripeAccountId, domain);
    } catch (err) {
      // Log but don't block checkout — Apple Pay won't appear but card still works
      log({
        level: "warn",
        layer: "api",
        message: "payment_method_domain_registration_failed_at_checkout",
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ---------- Create DIRECT CHARGE PaymentIntent on Connect account ----------
    const totalCents = Math.round(pricing.total * 100);

    // Platform fee: 0% for now (adjust as needed)
    const applicationFeeCents = 0;

    const { paymentIntentId, clientSecret } = await directCharge.createPaymentIntent({
      stripeAccountId,
      amountCents: totalCents,
      currency: "usd",
      metadata: {
        order_id: order.id,
        cart_hash: cartHash,
        fulfillment,
        tenant_id: tenantId,
        tax_calculation_id: pricing.taxCalculationId ?? "",
      },
      customerId: connectCustomerId,
      idempotencyKey,
      applicationFeeCents,
    });

    // Link payment intent to order
    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(order.id, paymentIntentId);
    }

    log({
      level: "info",
      layer: "api",
      message: "checkout_payment_intent_created",
      requestId,
      orderId: order.id,
      paymentIntentId,
      stripeAccountId,
      totalCents,
      fulfillment,
    });

    return json(
      {
        clientSecret,
        orderId: order.id,
        paymentIntentId,
        stripeAccountId, // Client must use this for Stripe Elements
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: pricing.tax,
        total: pricing.total,
        fulfillment,
        requestId,
      },
      200,
    );
  } catch (error: unknown) {
    // ✅ FIX: Ensure error is properly formatted before logging
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            typeof error === "object" && error !== null
              ? JSON.stringify(error)
              : String(error),
          );

    logError(normalizedError, {
      layer: "api",
      requestId,
      route: "/api/checkout/create-payment-intent",
      originalErrorType: error?.constructor?.name ?? typeof error,
    });

    if (error instanceof CheckoutError) {
      const statusMap: Record<string, number> = {
        NO_PRODUCTS: 400,
        MULTI_TENANT: 400,
        NO_STRIPE_ACCOUNT: 400,
        PRODUCT_NOT_FOUND: 400,
        VARIANT_NOT_FOUND: 400,
        INSUFFICIENT_STOCK: 409,
      };
      return json(
        { error: error.message, code: error.code, requestId },
        statusMap[error.code] ?? 500,
      );
    }

    return json({ error: normalizedError.message, requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
