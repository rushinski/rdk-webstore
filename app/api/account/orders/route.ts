// app/api/account/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUserApi } from "@/lib/auth/session";
import { OrdersService } from "@/services/orders-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const supabase = await createSupabaseServerClient();
    const service = new OrdersService(supabase);

    const orders = await service.listOrdersForUser(session.user.id);
    return NextResponse.json(
      { orders },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      message: "account_orders_error",
      requestId,
      route: "/api/account/orders",
    });
    return NextResponse.json(
      { error: "Failed to load orders", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
