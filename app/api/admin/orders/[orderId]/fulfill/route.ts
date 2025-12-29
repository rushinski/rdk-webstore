import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { OrdersService } from "@/services/orders-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

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
  { params }: { params: { orderId: string } }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new OrdersService(supabase);

    const paramsParsed = paramsSchema.safeParse(params);
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = fulfillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const updated = await service.markFulfilled(paramsParsed.data.orderId, {
      carrier: parsed.data.carrier ?? null,
      trackingNumber: parsed.data.trackingNumber ?? null,
    });

    return NextResponse.json(
      { order: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/orders/:orderId/fulfill",
    });
    return NextResponse.json(
      { error: "Failed to fulfill order", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
