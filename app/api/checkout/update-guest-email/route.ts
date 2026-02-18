// app/api/checkout/update-guest-email/route.ts
// Saves guest email to the database BEFORE payment redirect
// This prevents race conditions where sessionStorage is cleared during Afterpay redirect

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";

const updateGuestEmailSchema = z.object({
  orderId: z.string().uuid(),
  guestEmail: z.string().email().trim().min(1),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateGuestEmailSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        400,
      );
    }

    const { orderId, guestEmail } = parsed.data;

    log({
      level: "info",
      layer: "api",
      message: "update_guest_email_request",
      requestId,
      orderId,
      hasEmail: Boolean(guestEmail),
    });

    const adminSupabase = createSupabaseAdminClient();
    const ordersRepo = new OrdersRepository(adminSupabase);

    // Verify order exists and is not associated with a user
    const order = await ordersRepo.getById(orderId);
    if (!order) {
      return json({ error: "Order not found", requestId }, 404);
    }

    if (order.user_id) {
      // Order belongs to authenticated user, don't override with guest email
      log({
        level: "warn",
        layer: "api",
        message: "update_guest_email_rejected_user_order",
        requestId,
        orderId,
        userId: order.user_id,
      });
      return json({ error: "Cannot set guest email on user order", requestId }, 400);
    }

    // Update the guest email
    await ordersRepo.updateGuestEmail(orderId, guestEmail);

    log({
      level: "info",
      layer: "api",
      message: "guest_email_updated_successfully",
      requestId,
      orderId,
      email: guestEmail,
    });

    return json({ success: true, orderId, requestId }, 200);
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/update-guest-email",
    });

    return json(
      {
        error: error instanceof Error ? error.message : "Failed to update guest email",
        requestId,
      },
      500,
    );
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
