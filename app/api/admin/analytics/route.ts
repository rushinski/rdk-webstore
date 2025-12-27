import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";

const RANGE_DAYS: Record<string, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const toDateKey = (value: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().slice(0, 10);
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new OrdersRepository(supabase);

    const rangeParam = request.nextUrl.searchParams.get("range") || "30d";
    const days = RANGE_DAYS[rangeParam] ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await repo.listOrders({
      status: ["paid", "shipped", "refunded"],
    });

    const filtered = orders.filter((order: any) => {
      if (!order.created_at) return false;
      return new Date(order.created_at) >= startDate;
    });

    let revenue = 0;
    let profit = 0;
    let orderCount = 0;
    const trendMap = new Map<string, number>();

    filtered.forEach((order: any) => {
      orderCount += 1;
      const total = Number(order.total ?? 0);
      const refundAmount = Number(order.refund_amount ?? 0);

      const itemCost = (order.items || []).reduce((sum: number, item: any) => {
        const unitCost = Number(item.unit_cost ?? 0);
        return sum + unitCost * Number(item.quantity ?? 0);
      }, 0);

      revenue += total - refundAmount;
      profit += Number(order.subtotal ?? 0) - itemCost - refundAmount;

      const dateKey = toDateKey(order.created_at);
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + total - refundAmount);
    });

    const salesTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, revenue: Math.round(value * 100) / 100 }));

    return NextResponse.json({
      summary: {
        revenue,
        profit,
        orders: orderCount,
      },
      salesTrend,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
