import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new OrdersRepository(supabase);

    const order = await repo.getById(params.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json({ error: "Order has no payment intent" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedAmount = Number(body?.amount ?? order.total ?? 0);
    const refundAmount = Number.isFinite(requestedAmount) ? requestedAmount : Number(order.total ?? 0);

    await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100),
    });

    const updated = await repo.markRefunded(order.id, refundAmount);

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Admin refund error:", error);
    return NextResponse.json({ error: "Failed to refund order" }, { status: 500 });
  }
}
