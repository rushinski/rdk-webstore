import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { log, logError } from "@/lib/utils/log";
import { logCheckoutEvent } from "@/lib/checkout/log-checkout-event";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPaymentIntentSchema } from "@/lib/validation/checkout";
import { OrdersRepository } from "@/modules/orders";
import {
  CheckoutError,
  CheckoutPricingService,
} from "@/services/checkout-pricing-service";
import { createCartHash } from "@/lib/utils/crypto";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const startedAt = Date.now();

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
      if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
        await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
      }

      void logCheckoutEvent(adminSupabase, {
        orderId: existingOrder.id,
        tenantId: existingOrder.tenant_id,
        requestId,
        route: "/api/checkout/init-checkout",
        httpStatus: 200,
        durationMs: Date.now() - startedAt,
        eventLabel: "Checkout resumed",
      });

      return json(
        {
          orderId: existingOrder.id,
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

    const pricingService = new CheckoutPricingService(adminSupabase);
    let resolved;
    try {
      resolved = await pricingService.resolve({ items, fulfillment, shippingAddress });
    } catch (error) {
      if (error instanceof CheckoutError) {
        return json({ error: error.message, code: error.code, requestId }, 400);
      }
      throw error;
    }
    const { tenantId, lineItems, pricing } = resolved;

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const order = await ordersRepo.createPendingOrder({
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
        variantSku: li.variantSku,
        productName: li.titleDisplay,
        brand: li.brand,
        model: li.model,
        category: li.category,
        condition: li.condition,
        sizeLabel: li.sizeLabel,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        unitCost: li.unitCost,
        lineTotal: li.lineTotal,
      })),
    });

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

    void logCheckoutEvent(adminSupabase, {
      orderId: order.id,
      tenantId,
      requestId,
      route: "/api/checkout/init-checkout",
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
      eventLabel: "Checkout initialized",
    });

    return json(
      {
        orderId: order.id,
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
