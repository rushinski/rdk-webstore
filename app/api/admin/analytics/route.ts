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

const buildDateRange = (startDate: Date, days: number) => {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < days; i += 1) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const computeTraffic = (
  rows: Array<{ created_at: string | null; visitor_id: string | null; session_id: string | null }>,
  startDate: Date,
  days: number
) => {
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const dailySessions = new Map<string, Set<string>>();
  let pageViews = 0;
  let anonymousCounter = 0;

  for (const row of rows) {
    const dateKey = toDateKey(row.created_at);
    if (dateKey === "Unknown") continue;
    pageViews += 1;

    if (row.visitor_id) {
      visitors.add(row.visitor_id);
    }

    const sessionId =
      row.session_id || row.visitor_id || `anon-${anonymousCounter++}`;
    sessions.add(sessionId);

    const bucket = dailySessions.get(dateKey) ?? new Set<string>();
    bucket.add(sessionId);
    dailySessions.set(dateKey, bucket);
  }

  const trafficTrend = buildDateRange(startDate, days).map((date) => ({
    date,
    visits: dailySessions.get(date)?.size ?? 0,
  }));

  return {
    summary: {
      visits: sessions.size,
      uniqueVisitors: visitors.size,
      pageViews,
    },
    trafficTrend,
  };
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

    const { data: pageviewRows, error: pageviewError } = await supabase
      .from("site_pageviews")
      .select("created_at, visitor_id, session_id")
      .gte("created_at", startDate.toISOString());

    if (pageviewError) {
      throw pageviewError;
    }

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

    const traffic = computeTraffic(
      (pageviewRows ?? []) as Array<{
        created_at: string | null;
        visitor_id: string | null;
        session_id: string | null;
      }>,
      startDate,
      days
    );

    return NextResponse.json({
      summary: {
        revenue,
        profit,
        orders: orderCount,
      },
      salesTrend,
      trafficSummary: traffic.summary,
      trafficTrend: traffic.trafficTrend,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
