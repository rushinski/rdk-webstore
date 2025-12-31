// src/app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StripeOrderJob } from "@/jobs/stripe-order-job";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover", // FIXED: Updated API version
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

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
      return NextResponse.json(
        { error: "Missing signature", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Verify signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logError(err, {
        layer: "api",
        requestId,
        route: "/api/stripe/webhook",
      });
      return NextResponse.json(
        { error: "Invalid signature", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
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
    const adminSupabase = createSupabaseAdminClient();
    const job = new StripeOrderJob(supabase, adminSupabase);

    if (event.type === "checkout.session.completed") {
      await job.processCheckoutSessionCompleted(event, requestId);
    }

    return NextResponse.json(
      { received: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/stripe/webhook",
    });

    // Always return 200 to Stripe to avoid retries on our errors
    return NextResponse.json(
      { error: "Internal error", requestId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
