// src/app/api/checkout/session/route.ts (CORRECTED)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { CheckoutService } from "@/services/checkout-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";
import { checkoutSessionSchema } from "@/lib/validation/checkout";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();

    // Get user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "GUEST_CHECKOUT_DISABLED", code: "GUEST_CHECKOUT_DISABLED", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Parse body
    const body = await request.json().catch(() => null);
    const parsed = checkoutSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    log({
      level: "info",
      layer: "api", // FIXED: Changed from "route" to "api"
      message: "checkout_session_request",
      requestId,
      userId,
      itemCount: parsed.data.items.length,
      fulfillment: parsed.data.fulfillment,
    });

    // Create checkout session
    const adminSupabase = createSupabaseAdminClient();
    const checkoutService = new CheckoutService(supabase, adminSupabase);
    const result = await checkoutService.createCheckoutSession(parsed.data, userId);

    log({
      level: "info",
      layer: "api",
      message: "checkout_session_created",
      requestId,
      orderId: result.orderId,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/session",
    });

    if (
      error.message === "IDEMPOTENCY_KEY_EXPIRED" ||
      error.message === "CART_MISMATCH" ||
      error.message === "GUEST_EMAIL_REQUIRED" ||
      error.message === "GUEST_CHECKOUT_DISABLED"
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.message,
          requestId,
        },
        {
          status:
            error.message === "GUEST_EMAIL_REQUIRED"
              ? 400
              : error.message === "GUEST_CHECKOUT_DISABLED"
                ? 403
                : 409,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message: error.message,
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
