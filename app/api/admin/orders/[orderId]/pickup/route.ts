// app/api/admin/orders/[orderId]/pickup/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const paramsSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const ordersRepo = new OrdersRepository(supabase);
    const eventsRepo = new OrderEventsRepository(supabase);

    const { orderId } = await params;
    const paramsParsed = paramsSchema.safeParse({ orderId });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const order = await ordersRepo.getById(paramsParsed.data.orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (order.fulfillment !== "pickup") {
      return NextResponse.json(
        { error: "Order is not a pickup", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (order.fulfillment_status !== "picked_up") {
      await ordersRepo.setFulfillmentStatus(order.id, "picked_up");
    }

    try {
      const hasEvent = await eventsRepo.hasEvent(order.id, "picked_up");
      if (!hasEvent) {
        await eventsRepo.insertEvent({
          orderId: order.id,
          type: "picked_up",
          message: "Order picked up.",
          createdBy: session.user.id,
        });
      }
    } catch (eventError) {
      logError(eventError, {
        layer: "api",
        requestId,
        route: "/api/admin/orders/:orderId/pickup",
        message: "Failed to create pickup event",
        orderId: order.id,
      });
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/orders/:orderId/pickup",
    });
    return NextResponse.json(
      { error: "Failed to mark pickup complete", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
