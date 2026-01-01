// app/api/admin/orders/[orderId]/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersService } from "@/services/orders-service";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

const paramsSchema = z.object({
  orderId: z.string().uuid(),
});

const refundSchema = z
  .object({
    amount: z.number().positive().optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new OrdersService(supabase);

    const { orderId } = await params;
    const paramsParsed = paramsSchema.safeParse({ orderId });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orderData = await service.getOrderById(paramsParsed.data.orderId);

    if (!orderData) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!orderData.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "Order has no payment intent", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = refundSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const requestedAmount = parsed.data.amount ?? Number(orderData.total ?? 0);
    const refundAmount = Number.isFinite(requestedAmount)
      ? requestedAmount
      : Number(orderData.total ?? 0);

    await stripe.refunds.create({
      payment_intent: orderData.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100),
    });

    const updated = await service.markRefunded(orderData.id, refundAmount);

    return NextResponse.json(
      { order: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/orders/:orderId/refund",
    });
    return NextResponse.json(
      { error: "Failed to refund order", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
