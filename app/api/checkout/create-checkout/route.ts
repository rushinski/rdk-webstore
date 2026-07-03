import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { log, logError } from "@/lib/utils/log";
import { logCheckoutEvent } from "@/lib/checkout/log-checkout-event";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCheckoutSchema } from "@/lib/validation/checkout";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { OrdersRepository } from "@/modules/orders";
import { ProductService } from "@/services/product-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import {
  CheckoutError,
  CheckoutPricingService,
} from "@/services/checkout-pricing-service";
import { sendOrderCompletionEmailsIfNeeded } from "@/services/order-completion-email-service";
import { createCartHash } from "@/lib/utils/crypto";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const ipAttempts = new Map<string, number[]>();

type CheckoutAddress = {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (ipAttempts.get(ip) ?? []).filter(
    (attemptedAt) => now - attemptedAt < RATE_LIMIT_WINDOW_MS,
  );
  if (attempts.length >= RATE_LIMIT_MAX) {
    ipAttempts.set(ip, attempts);
    return true;
  }
  attempts.push(now);
  ipAttempts.set(ip, attempts);
  return false;
}

function toAddressSnapshot(address: CheckoutAddress) {
  return {
    name: address.name,
    phone: address.phone ?? null,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
  };
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const startedAt = Date.now();

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const customerIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    if (customerIp && isRateLimited(customerIp)) {
      return json({ error: "Too many requests", code: "RATE_LIMITED", requestId }, 429);
    }

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      return json(
        { error: "GUEST_CHECKOUT_DISABLED", code: "GUEST_CHECKOUT_DISABLED", requestId },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createCheckoutSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        400,
      );
    }

    const { items, fulfillment, idempotencyKey, guestEmail, shippingAddress } = parsed.data;
    const adminSupabase = createSupabaseAdminClient();
    const ordersRepo = new OrdersRepository(userId ? supabase : adminSupabase);
    const orderAccessTokens = new OrderAccessTokenService(adminSupabase);
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
      if (existingOrder.status === "paid" || existingOrder.status === "processing") {
        const guestAccessToken = existingOrder.user_id
          ? null
          : (await orderAccessTokens.createToken({ orderId: existingOrder.id })).token;
        return json(
          {
            status: existingOrder.status,
            orderId: existingOrder.id,
            ...(guestAccessToken ? { guestAccessToken } : {}),
            requestId,
          },
          200,
        );
      }
      if (existingOrder.status === "failed") {
        await ordersRepo.resetFailedOrderForRetry(
          existingOrder.id,
          new Date(Date.now() + 60 * 60 * 1000),
        );
      }
      if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
        await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
      }
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
      }));

    const guestAccessToken = order.user_id
      ? null
      : (await orderAccessTokens.createToken({ orderId: order.id })).token;

    if (fulfillment === "ship" && shippingAddress) {
      const addressesRepo = new AddressesRepository(adminSupabase);
      await addressesRepo.upsertOrderShippingSnapshot(
        order.id,
        toAddressSnapshot(shippingAddress),
      );
    }

    await adminSupabase
      .from("orders")
      .update({
        status: "processing",
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax_amount: pricing.tax,
        tax_calculation_id: pricing.taxCalculationId,
        total: pricing.total,
        fulfillment,
        customer_state: pricing.customerState,
        failure_reason: null,
      })
      .eq("id", order.id);

    const orderItems = await ordersRepo.getOrderItems(order.id);
    const orderEventsRepo = new OrderEventsRepository(adminSupabase);
    await orderEventsRepo.insertEvent({
      orderId: order.id,
      type: "submitted",
      message: "Order submitted and queued for processing.",
    });

    const productService = new ProductService(adminSupabase);
    const orderItemProductIds = [
      ...new Set(
        orderItems
          .map((item) => item.product_id)
          .filter((productId): productId is string => typeof productId === "string"),
      ),
    ];
    for (const productId of orderItemProductIds) {
      await productService.syncSizeTags(productId);
    }

    await sendOrderCompletionEmailsIfNeeded({
      order: { ...order, status: "processing", total: pricing.total, subtotal: pricing.subtotal },
      orderId: order.id,
      orderItems,
      fulfillment,
      adminSupabase,
      requestId,
      logLayer: "api",
    });

    log({
      level: "info",
      layer: "api",
      message: "checkout_submitted",
      requestId,
      orderId: order.id,
      tenantId,
      fulfillment,
      total: pricing.total,
    });

    void logCheckoutEvent(adminSupabase, {
      orderId: order.id,
      tenantId,
      requestId,
      route: "/api/checkout/create-checkout",
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
      eventLabel: "Checkout submitted",
      requestPayload: body,
      responsePayload: {
        status: "processing",
        orderId: order.id,
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: pricing.tax,
        total: pricing.total,
        fulfillment,
        requestId,
      },
    });

    return json(
      {
        status: "processing",
        orderId: order.id,
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: pricing.tax,
        total: pricing.total,
        fulfillment,
        ...(guestAccessToken ? { guestAccessToken } : {}),
        requestId,
      },
      200,
    );
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/checkout/create-checkout" });

    if (error instanceof CheckoutError) {
      return json({ error: error.message, code: error.code, requestId }, 400);
    }

    return json({ error: "Internal server error", requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
