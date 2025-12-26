// src/app/api/orders/[orderId]/route.ts (CORRECTED)

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersService } from "@/services/orders-service";
import { generateRequestId } from "@/lib/http/request-id";
import { log } from "@/lib/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = generateRequestId();
  const { orderId } = await params;

  try {
    const supabase = await createSupabaseServerClient();

    // Get user (optional)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Get public_token from query (for guest access)
    const publicToken = request.nextUrl.searchParams.get("token");

    log({
      level: "info",
      layer: "api",
      message: "order_status_request",
      requestId,
      orderId,
      userId,
      hasToken: !!publicToken,
    });

    // Get order status
    const ordersService = new OrdersService(supabase);
    const status = await ordersService.getOrderStatus(orderId, userId, publicToken);

    return NextResponse.json(status);
  } catch (error: any) {
    log({
      level: "error",
      layer: "api",
      message: "order_status_error",
      requestId,
      orderId,
      error: error.message,
    });

    if (error.message === "Unauthorized" || error.message === "Order not found") {
      return NextResponse.json(
        { error: error.message, requestId },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch order status", requestId },
      { status: 500 }
    );
  }
}