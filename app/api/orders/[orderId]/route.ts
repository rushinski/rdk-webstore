// src/app/api/orders/[orderId]/route.ts
// DEBUGGING VERSION - Detailed logging at every step

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersService } from "@/services/orders-service";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";

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

  log({
    level: "info",
    layer: "api",
    message: "order_status_request_start",
    requestId,
    url: request.url,
  });

  try {
    // Step 1: Resolve params
    log({
      level: "info",
      layer: "api",
      message: "order_status_resolving_params",
      requestId,
    });

    const resolvedParams = await params;
    const { orderId } = resolvedParams;

    log({
      level: "info",
      layer: "api",
      message: "order_status_params_resolved",
      requestId,
      orderId,
    });

    // Step 2: Validate params
    const paramsParsed = paramsSchema.safeParse({ orderId });
    if (!paramsParsed.success) {
      log({
        level: "error",
        layer: "api",
        message: "order_status_invalid_params",
        requestId,
        orderId,
        errors: paramsParsed.error.format(),
      });
      return json(
        { error: "Invalid order ID", issues: paramsParsed.error.format(), requestId },
        400,
      );
    }

    // Step 3: Get token from query
    const tokenParam = request.nextUrl.searchParams.get("token");
    log({
      level: "info",
      layer: "api",
      message: "order_status_token_check",
      requestId,
      orderId,
      hasTokenParam: Boolean(tokenParam),
      tokenLength: tokenParam?.length,
    });

    const queryParsed = querySchema.safeParse({
      token: tokenParam && tokenParam.trim().length > 0 ? tokenParam : undefined,
    });

    if (!queryParsed.success) {
      log({
        level: "error",
        layer: "api",
        message: "order_status_invalid_query",
        requestId,
        orderId,
        errors: queryParsed.error.format(),
      });
      return json(
        { error: "Invalid query", issues: queryParsed.error.format(), requestId },
        400,
      );
    }

    // Step 4: Get user session
    log({
      level: "info",
      layer: "api",
      message: "order_status_checking_auth",
      requestId,
      orderId,
    });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    log({
      level: "info",
      layer: "api",
      message: "order_status_auth_checked",
      requestId,
      orderId,
      hasUser: Boolean(user),
      userId,
      userEmail: user?.email,
    });

    // Step 5: Get access token
    const accessToken = queryParsed.data.token ?? null;

    log({
      level: "info",
      layer: "api",
      message: "order_status_before_service_call",
      requestId,
      orderId,
      hasUserId: Boolean(userId),
      hasAccessToken: Boolean(accessToken),
      accessTokenLength: accessToken?.length,
    });

    // Step 6: Call service
    const adminSupabase = createSupabaseAdminClient();
    const ordersService = new OrdersService(supabase, adminSupabase);

    log({
      level: "info",
      layer: "api",
      message: "order_status_calling_service",
      requestId,
      orderId,
      userId,
      hasAccessToken: Boolean(accessToken),
    });

    const status = await ordersService.getOrderStatus(
      paramsParsed.data.orderId,
      userId,
      accessToken,
    );

    log({
      level: "info",
      layer: "api",
      message: "order_status_success",
      requestId,
      orderId,
      orderStatus: status.status,
      eventCount: status.events.length,
    });

    return json(status, 200);
  } catch (error: unknown) {
    log({
      level: "error",
      layer: "api",
      message: "order_status_error",
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    logError(error, {
      layer: "api",
      requestId,
      route: "/api/orders/:orderId",
      userId: null,
      method: "GET",
    });

    const message =
      error instanceof Error ? error.message : "Failed to fetch order status";

    if (message === "Unauthorized") {
      return json({ error: message, requestId }, 401);
    }

    if (message === "Order not found") {
      return json({ error: message, requestId }, 404);
    }

    return json({ error: "Failed to fetch order status", requestId }, 500);
  }
}

function json<T>(data: T, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
