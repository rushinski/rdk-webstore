// src/app/api/checkout/session/route.ts (CORRECTED)

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckoutService } from "@/services/checkout-service";
import { generateRequestId } from "@/lib/http/request-id";
import { log } from "@/lib/log";
import type { CheckoutSessionRequest } from "@/types/views/checkout";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const supabase = await createSupabaseServerClient();

    // Get user (optional)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Parse body
    const body: CheckoutSessionRequest = await request.json();

    log({
      level: "info",
      layer: "api", // FIXED: Changed from "route" to "api"
      message: "checkout_session_request",
      requestId,
      userId,
      itemCount: body.items.length,
      fulfillment: body.fulfillment,
    });

    // Create checkout session
    const checkoutService = new CheckoutService(supabase);
    const result = await checkoutService.createCheckoutSession(body, userId);

    log({
      level: "info",
      layer: "api",
      message: "checkout_session_created",
      requestId,
      orderId: result.orderId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    log({
      level: "error",
      layer: "api",
      message: "checkout_session_error",
      requestId,
      error: error.message,
    });

    if (error.message === "IDEMPOTENCY_KEY_EXPIRED" || error.message === "CART_MISMATCH") {
      return NextResponse.json(
        {
          error: error.message,
          code: error.message,
          requestId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message: error.message,
        requestId,
      },
      { status: 500 }
    );
  }
}