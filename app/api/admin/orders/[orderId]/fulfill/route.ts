// app/api/admin/orders/[orderId]/fulfill/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersService } from "@/services/orders-service";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const paramsSchema = z.object({
  orderId: z.string().uuid(),
});

const fulfillSchema = z
  .object({
    carrier: z.string().trim().min(1).nullable().optional(),
    trackingNumber: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new OrdersService(supabase);

    const { orderId } = await params;
    const paramsParsed = paramsSchema.safeParse({ orderId });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = fulfillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Fetch existing order
    const existing = await service.getOrderById(paramsParsed.data.orderId);
    if (!existing) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Mark as shipped (fulfillment_status: shipped)
    const updated = await service.markFulfilled(paramsParsed.data.orderId, {
      carrier: parsed.data.carrier ?? null,
      trackingNumber: parsed.data.trackingNumber ?? null,
    });

    try {
      const eventsRepo = new OrderEventsRepository(supabase);
      const hasEvent = await eventsRepo.hasEvent(updated.id, "shipped");
      if (!hasEvent) {
        await eventsRepo.insertEvent({
          orderId: updated.id,
          type: "shipped",
          message: "Order marked as shipped.",
          createdBy: session.user.id,
        });
      }
    } catch (eventError) {
      logError(eventError, {
        layer: "api",
        requestId,
        route: "/api/admin/orders/:orderId/fulfill",
        message: "Failed to create order event",
        orderId: updated.id,
      });
    }

    // NOTE: We do NOT send email here
    // The "in transit" email will be sent by the EasyPost webhook
    // when the carrier first scans the package
    // This ensures customers get notified when package actually starts moving

    return NextResponse.json(
      { order: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/orders/:orderId/fulfill",
    });
    return NextResponse.json(
      { error: "Failed to fulfill order", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
