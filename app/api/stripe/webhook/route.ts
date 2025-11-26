import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/config/env";
import { createAdminClient } from "@/lib/supabase";
import { OrdersRepo } from "@/repositories/orders-repo";
import { ProfilesRepo } from "@/repositories/profiles-repo";
import { OrderService } from "@/services/order-service";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const signature = req.headers.get("stripe-signature") ?? "";

  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient(requestId);

  const orders = new OrdersRepo({ supabase: admin, requestId });
  const profiles = new ProfilesRepo({ supabase: admin, requestId });

  const service = new OrderService({
    repos: { orders, profiles },
    requestId,
    userId: null,
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await service.finalizeOrderFromStripe(session.id, Number(session.amount_total) / 100);
  }

  return NextResponse.json({ received: true, requestId });
}
