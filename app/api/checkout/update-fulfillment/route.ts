// src/app/api/checkout/update-fulfillment/route.ts
//
// Called when the user changes fulfillment (ship ↔ pickup) or enters a
// shipping address during checkout. Recalculates pricing and updates
// the PaymentIntent on the Connect account.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { CheckoutPricingService } from "@/services/checkout-pricing-service";
import { StripeDirectChargeService } from "@/services/stripe-direct-charge-service";
import { createCartHash } from "@/lib/utils/crypto";
import { updateFulfillmentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const directCharge = new StripeDirectChargeService();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const adminSupabase = createSupabaseAdminClient();

    const body = await request.json().catch(() => null);
    const parsed = updateFulfillmentSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return json({ error: "Invalid payload", issues: parsed.error.format(), requestId }, 400);
    }

    const { orderId, fulfillment, shippingAddress } = parsed.data;
    const ordersRepo = new OrdersRepository(adminSupabase);
    const order = await ordersRepo.getById(orderId);

    if (!order) {
      return json({ error: "Order not found", requestId }, 404);
    }

    // Auth checks
    if (!userId && order.user_id) {
      return json({ error: "Unauthorized", requestId }, 403);
    }
    if (userId && order.user_id && order.user_id !== userId) {
      return json({ error: "Unauthorized", requestId }, 403);
    }
    if (order.status !== "pending") {
      return json({ error: "ORDER_NOT_PENDING", code: "ORDER_NOT_PENDING", requestId }, 409);
    }
    if (!order.stripe_payment_intent_id || !order.tenant_id) {
      return json({ error: "MISSING_PAYMENT_INTENT", code: "MISSING_PAYMENT_INTENT", requestId }, 409);
    }

    // Get tenant's Stripe account
    const profileRepo = new ProfileRepository(adminSupabase);
    const stripeAccountId = await profileRepo.getStripeAccountIdForTenant(order.tenant_id);
    if (!stripeAccountId) {
      return json({ error: "Seller payment account not configured", requestId }, 400);
    }

    // Verify payment intent is still active
    const pi = await directCharge.retrievePaymentIntent(stripeAccountId, order.stripe_payment_intent_id);
    if (pi.status === "succeeded") {
      return json({ error: "ORDER_ALREADY_PAID", code: "ORDER_ALREADY_PAID", requestId }, 409);
    }
    if (pi.status === "canceled") {
      return json({ error: "PAYMENT_INTENT_CANCELED", code: "PAYMENT_INTENT_CANCELED", requestId }, 409);
    }

    // Rebuild line items from order items for pricing recalculation
    const orderItems = await ordersRepo.getOrderItems(orderId);
    if (orderItems.length === 0) {
      return json({ error: "Order has no items", requestId }, 400);
    }

    const productIds = [...new Set(orderItems.map((i) => i.product_id))];
    const productsRepo = new ProductRepository(adminSupabase);
    const products = await productsRepo.getProductsForCheckout(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const lineItems = orderItems.map((item) => {
      const product = productMap.get(item.product_id);
      return {
        productId: item.product_id,
        variantId: item.variant_id ?? "",
        quantity: item.quantity,
        unitPrice: Number(item.unit_price ?? 0),
        unitCost: Number(item.unit_cost ?? 0),
        lineTotal: Number(item.line_total ?? 0),
        titleDisplay: product?.titleDisplay ?? "",
        brand: product?.brand ?? "",
        name: product?.name ?? "",
        category: product?.category ?? "other",
      };
    });

    // Recalculate pricing with new fulfillment/address
    const pricingService = new CheckoutPricingService(adminSupabase);
    const pricing = await pricingService.recalculate({
      tenantId: order.tenant_id,
      stripeAccountId,
      lineItems,
      fulfillment,
      shippingAddress,
    });

    const totalCents = Math.round(pricing.total * 100);
    const cartHash = createCartHash(
      orderItems.map((i) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      })),
      fulfillment,
    );

    // Update PaymentIntent on Connect account (direct charge)
    await directCharge.updatePaymentIntent(stripeAccountId, order.stripe_payment_intent_id, {
      amountCents: totalCents,
      metadata: {
        fulfillment,
        cart_hash: cartHash,
        tax_calculation_id: pricing.taxCalculationId ?? "",
      },
    });

    // Update order in DB
    await adminSupabase
      .from("orders")
      .update({
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax_amount: pricing.tax,
        tax_calculation_id: pricing.taxCalculationId,
        total: pricing.total,
        fulfillment,
        cart_hash: cartHash,
        customer_state: pricing.customerState,
      })
      .eq("id", orderId);

    return json({
      subtotal: pricing.subtotal,
      shipping: pricing.shipping,
      tax: pricing.tax,
      total: pricing.total,
      fulfillment,
      requestId,
    }, 200);
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/checkout/update-fulfillment" });
    return json({ error: "Failed to update fulfillment", requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}