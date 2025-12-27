import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new OrdersRepository(supabase);

    const searchParams = request.nextUrl.searchParams;
    const statuses = searchParams.getAll("status").filter(Boolean);
    const fulfillment = searchParams.get("fulfillment") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") || undefined;

    const orders = await repo.listOrders({
      status: statuses.length ? statuses : undefined,
      fulfillment,
      fulfillmentStatus,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Admin orders list error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
