// app/api/admin/orders/[orderId]/payment-events/route.ts
//
// Returns the payment_transactions row + payment_events timeline for an order.
// Used by the seller order detail page.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { PaymentTransactionsRepository } from "@/repositories/payment-transactions-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();

    const { orderId } = await params;
    if (!orderId) {
      return json({ error: "Missing orderId", requestId }, 400);
    }

    const adminSupabase = createSupabaseAdminClient();
    const repo = new PaymentTransactionsRepository(adminSupabase);

    const [transaction, events] = await Promise.all([
      repo.getByOrderId(orderId),
      repo.getEventsByOrderId(orderId),
    ]);

    return json({ transaction, events, requestId }, 200);
  } catch (error) {
    logError(error, { layer: "api", requestId, route: "/api/admin/orders/[orderId]/payment-events" });
    return json({ error: "Internal server error", requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
