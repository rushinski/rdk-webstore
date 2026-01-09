// src/app/api/checkout/update-fulfillment/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { createCartHash } from "@/lib/crypto";
import { updateFulfillmentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

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
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { orderId, fulfillment } = parsed.data;

    const ordersRepo = new OrdersRepository(adminSupabase);
    const order = await ordersRepo.getById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!userId && order.user_id) {
      return NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (userId && order.user_id && order.user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "ORDER_NOT_PENDING", code: "ORDER_NOT_PENDING", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "MISSING_PAYMENT_INTENT", code: "MISSING_PAYMENT_INTENT", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orderItems = await ordersRepo.getOrderItems(orderId);
    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: "Order has no items", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const productIds = [...new Set(orderItems.map((item) => item.product_id))];
    const productsRepo = new ProductRepository(adminSupabase);
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const tenantIds = new Set(
      products.map((product) => product.tenantId).filter((id): id is string => Boolean(id))
    );
    if (tenantIds.size !== 1) {
      return NextResponse.json(
        { error: "Checkout requires a single tenant", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const [tenantId] = [...tenantIds];

    const categories = [...new Set(products.map((product) => product.category))];
    const shippingDefaultsRepo = new ShippingDefaultsRepository(adminSupabase);
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(tenantId, categories);
    const shippingDefaultsMap = new Map(
      shippingDefaults.map((row) => [row.category, Number(row.shipping_cost_cents ?? 0)])
    );

    const subtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0
    );

    let shipping = 0;
    if (fulfillment === "ship") {
      const shippingCosts = orderItems.map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) return 0;
        const costInCents = shippingDefaultsMap.get(product.category) ?? 0;
        return costInCents / 100;
      });
      shipping = Math.max(...shippingCosts, 0);
    }

    const total = subtotal + shipping;
    const cartHash = createCartHash(
      orderItems.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      })),
      fulfillment
    );

    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);

    if (paymentIntent.status === "succeeded") {
      return NextResponse.json(
        { error: "ORDER_ALREADY_PAID", code: "ORDER_ALREADY_PAID", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (paymentIntent.status === "canceled") {
      return NextResponse.json(
        { error: "PAYMENT_INTENT_CANCELED", code: "PAYMENT_INTENT_CANCELED", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
      amount: Math.round(total * 100),
      metadata: {
        fulfillment,
        cart_hash: cartHash,
      },
    });

    await ordersRepo.updatePricingAndFulfillment(orderId, {
      subtotal,
      shipping,
      total,
      fulfillment,
      cartHash,
    });

    return NextResponse.json(
      { subtotal, shipping, total, fulfillment, requestId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/update-fulfillment",
    });

    return NextResponse.json(
      { error: "Failed to update fulfillment", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
