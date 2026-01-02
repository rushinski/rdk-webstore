// app/api/admin/orders/[orderId]/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { orderId } = await params;

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const ordersRepo = new OrdersRepository(supabase);

    const order = await ordersRepo.getById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404 }
      );
    }

    if (order.status === "refunded") {
        return NextResponse.json(
          { error: "Order has already been refunded", requestId },
          { status: 400 }
        );
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "Cannot refund order: Missing payment information", requestId },
        { status: 400 }
      );
    }

    // Create a refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      reason: "requested_by_customer", // Can be customized later
    });

    if (refund.status === 'failed') {
        throw new Error(`Stripe refund failed with reason: ${refund.failure_reason}`);
    }

    // Update the order in our database
    await ordersRepo.markRefunded(orderId, refund.amount);

    return NextResponse.json({ success: true, refundId: refund.id });

  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: `/api/admin/orders/${orderId}/refund`,
      message: "Failed to refund order",
    });

    const errorMessage = error.raw?.message || "Failed to process refund.";

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: 500 }
    );
  }
}
