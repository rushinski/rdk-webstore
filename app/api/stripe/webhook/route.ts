// src/app/api/stripe/webhook/route.ts (CORRECTED)

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StripeOrderJob } from "@/jobs/stripe-order-job";
import { generateRequestId } from "@/lib/http/request-id";
import { log } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover", // FIXED: Updated API version
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      log({
        level: "warn",
        layer: "api",
        message: "stripe_webhook_missing_signature",
        requestId,
      });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      log({
        level: "error",
        layer: "api",
        message: "stripe_webhook_signature_verification_failed",
        requestId,
        error: err.message,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    log({
      level: "info",
      layer: "api",
      message: "stripe_webhook_received",
      requestId,
      eventType: event.type,
      eventId: event.id,
    });

    // Process event
    const supabase = await createSupabaseServerClient();
    const job = new StripeOrderJob(supabase);

    if (event.type === "checkout.session.completed") {
      await job.processCheckoutSessionCompleted(event, requestId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    log({
      level: "error",
      layer: "api",
      message: "stripe_webhook_error",
      requestId,
      error: error.message,
    });

    // Always return 200 to Stripe to avoid retries on our errors
    return NextResponse.json({ error: "Internal error", requestId }, { status: 200 });
  }
}