// app/api/checkout/init-checkout/route.ts
//
// Initializes a pending order for the PayRilla checkout flow.
// Called when the checkout page loads — before any card data is entered.
//
// Flow:
//   1. Frontend calls this to create a pending order and get the tokenization key
//   2. Frontend uses tokenizationKey to initialize PayRilla HostedTokenization
//   3. Customer fills card form; frontend calls hostedTokenization.getNonceToken()
//   4. Frontend POSTs nonce + order data to /api/checkout/create-checkout
//
// Returns: { orderId, tokenizationKey, subtotal, shipping, tax, total, fulfillment }

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import {
  CheckoutPricingService,
  CheckoutError,
} from "@/services/checkout-pricing-service";
import { PayrillaChargeService } from "@/services/payrilla-charge-service";
import { createCartHash } from "@/lib/utils/crypto";
import { createPaymentIntentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      return json(
        { error: "GUEST_CHECKOUT_DISABLED", code: "GUEST_CHECKOUT_DISABLED", requestId },
        403,
      );
    }

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

    // ---------- Idempotency ----------
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
      if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
        await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
      }

      // Return existing order with tokenization key
      if (existingOrder.tenant_id) {
        const payrillaService = new PayrillaChargeService(
          adminSupabase,
          existingOrder.tenant_id,
        );
        const creds = await payrillaService.getCredentials();
        if (creds) {
          return json(
            {
              orderId: existingOrder.id,
              tokenizationKey: creds.tokenizationKey,
              subtotal: Number(existingOrder.subtotal ?? 0),
              shipping: Number(existingOrder.shipping ?? 0),
              tax: Number(existingOrder.tax_amount ?? 0),
              total: Number(existingOrder.total ?? 0),
              fulfillment: existingOrder.fulfillment ?? fulfillment,
              requestId,
            },
            200,
          );
        }
      }
    }

    // ---------- Pricing ----------
    const pricingService = new CheckoutPricingService(adminSupabase);
    let resolved;
    try {
      resolved = await pricingService.resolve({ items, fulfillment, shippingAddress });
    } catch (err) {
      if (err instanceof CheckoutError) {
        return json({ error: err.message, code: err.code, requestId }, 400);
      }
      throw err;
    }
    const { tenantId, lineItems, pricing } = resolved;

    // ---------- Get tokenization key ----------
    const payrillaService = new PayrillaChargeService(adminSupabase, tenantId);
    const creds = await payrillaService.getCredentials();
    if (!creds) {
      return json(
        {
          error: "Payment system not configured",
          code: "PAYMENT_NOT_CONFIGURED",
          requestId,
        },
        400,
      );
    }

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

    // Save tax info
    await adminSupabase
      .from("orders")
      .update({
        tax_amount: pricing.tax,
        tax_calculation_id: pricing.taxCalculationId,
        customer_state: pricing.customerState,
      })
      .eq("id", order.id);

    log({
      level: "info",
      layer: "api",
      message: "checkout_initialized",
      requestId,
      orderId: order.id,
      tenantId,
      fulfillment,
    });

    return json(
      {
        orderId: order.id,
        tokenizationKey: creds.tokenizationKey,
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
    logError(error, { layer: "api", requestId, route: "/api/checkout/init-checkout" });

    if (error instanceof CheckoutError) {
      return json({ error: error.message, code: error.code, requestId }, 400);
    }

    return json({ error: "Internal server error", requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
