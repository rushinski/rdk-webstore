// src/app/api/orders/[orderId]/route.ts (CORRECTED)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersService } from "@/services/orders-service";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const paramsSchema = z.object({
  orderId: z.string().uuid(),
});

const querySchema = z
  .object({
    token: z.string().trim().min(1).optional(),
  })
  .strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { orderId } = await params;
  const paramsParsed = paramsSchema.safeParse({ orderId });
  const tokenParam = request.nextUrl.searchParams.get("token");
  const queryParsed = querySchema.safeParse({
    token: tokenParam && tokenParam.trim().length > 0 ? tokenParam : undefined,
  });

  if (!paramsParsed.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: queryParsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Get user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Get access token from query (for guest access)
    const accessToken = queryParsed.data.token ?? null;

    // Get order status
    const adminSupabase = createSupabaseAdminClient();
    const ordersService = new OrdersService(supabase, adminSupabase);
    const status = await ordersService.getOrderStatus(
      paramsParsed.data.orderId,
      userId,
      accessToken,
    );

    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/orders/:orderId",
    });

    const message =
      error instanceof Error ? error.message : "Failed to fetch order status";

    if (message === "Unauthorized" || message === "Order not found") {
      return NextResponse.json(
        { error: message, requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch order status", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
