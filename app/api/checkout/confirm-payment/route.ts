// src/app/api/checkout/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { OrdersRepository } from "@/repositories/orders-repo";
import { confirmPaymentSchema } from "@/lib/validation/checkout";
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
    const body = await request.json().catch(() => null);
    const parsed = confirmPaymentSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { orderId, paymentIntentId, fulfillment } = parsed.data;

    const ordersRepo = new OrdersRepository(supabase);
    const order = await ordersRepo.getById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (order.status === "paid") {
      return NextResponse.json(
        { success: true, alreadyPaid: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.order_id && paymentIntent.metadata.order_id !== orderId) {
      return NextResponse.json(
        { error: "Payment intent does not match order", code: "PAYMENT_INTENT_MISMATCH", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent already attached to order", code: "PAYMENT_INTENT_CONFLICT", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (paymentIntent.status === "processing") {
      return NextResponse.json(
        { success: true, processing: true },
        { status: 202, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed", code: "PAYMENT_NOT_SUCCEEDED", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const expectedAmount = Math.round(Number(order.total ?? 0) * 100);
    const expectedCurrency = (order.currency ?? "USD").toLowerCase();
    if (
      paymentIntent.amount !== expectedAmount ||
      paymentIntent.currency?.toLowerCase() !== expectedCurrency
    ) {
      return NextResponse.json(
        { error: "Payment amount mismatch", code: "PAYMENT_AMOUNT_MISMATCH", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(orderId, paymentIntentId);
    }

    if (fulfillment && fulfillment !== order.fulfillment) {
      return NextResponse.json(
        { error: "Fulfillment mismatch. Please refresh checkout.", code: "FULFILLMENT_MISMATCH", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get order items and decrement inventory
    const orderItems = await ordersRepo.getOrderItems(orderId);
    const itemsToDecrement = orderItems.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    }));

    const didMarkPaid = await ordersRepo.markPaidTransactionally(orderId, paymentIntentId, itemsToDecrement);
    if (!didMarkPaid) {
      return NextResponse.json(
        { success: true, alreadyPaid: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/confirm-payment",
    });

    return NextResponse.json(
      { error: error.message || "Failed to confirm payment", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}