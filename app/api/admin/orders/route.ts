import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersService } from "@/services/orders-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const statusSchema = z.array(z.string().trim().min(1));
const fulfillmentSchema = z.enum(["ship", "pickup"]).optional();
const fulfillmentStatusSchema = z.string().trim().min(1).optional();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new OrdersService(supabase);

    const searchParams = request.nextUrl.searchParams;
    const statusesRaw = searchParams.getAll("status").filter(Boolean);
    const fulfillmentRaw = searchParams.get("fulfillment") ?? undefined;
    const fulfillmentStatusRaw =
      searchParams.get("fulfillmentStatus") ?? undefined;

    const parsedStatuses = statusSchema.safeParse(statusesRaw);
    const parsedFulfillment = fulfillmentSchema.safeParse(fulfillmentRaw);
    const parsedFulfillmentStatus =
      fulfillmentStatusSchema.safeParse(fulfillmentStatusRaw);

    if (!parsedStatuses.success) {
      return NextResponse.json(
        { error: "Invalid status", issues: parsedStatuses.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!parsedFulfillment.success) {
      return NextResponse.json(
        { error: "Invalid fulfillment", issues: parsedFulfillment.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!parsedFulfillmentStatus.success) {
      return NextResponse.json(
        { error: "Invalid fulfillmentStatus", issues: parsedFulfillmentStatus.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orders = await service.listOrders({
      status: parsedStatuses.data.length ? parsedStatuses.data : undefined,
      fulfillment: parsedFulfillment.data,
      fulfillmentStatus: parsedFulfillmentStatus.data,
    });

    return NextResponse.json(
      { orders },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/orders",
    });
    return NextResponse.json(
      { error: "Failed to fetch orders", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
