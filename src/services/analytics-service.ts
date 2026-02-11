import { OrdersRepository } from "@/repositories/orders-repo";
import { SitePageviewsRepository } from "@/repositories/site-pageviews-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  getOrderNetProfitDollars,
  getOrderNetRevenueDollars,
} from "@/lib/orders/metrics";

const rangeDays: Record<string, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

interface OrderForAnalytics {
  created_at: string | null;
  total: string | number | null;
  refund_amount: string | number | null;
  subtotal: string | number | null;
  items: Array<{
    unit_cost: string | number | null;
    quantity: string | number | null;
    refunded_at?: string | null;
  }> | null;
}

interface PageviewRow {
  created_at: string | null;
  visitor_id: string | null;
  session_id: string | null;
}

const toDateKey = (value: string | null) => {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
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

const computeTraffic = (rows: PageviewRow[], startDate: Date, days: number) => {
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const dailySessions = new Map<string, Set<string>>();
  let pageViews = 0;
  let anonymousCounter = 0;

  for (const row of rows) {
    const dateKey = toDateKey(row.created_at);
    if (dateKey === "Unknown") {
      continue;
    }
    pageViews += 1;

    if (row.visitor_id) {
      visitors.add(row.visitor_id);
    }

    const sessionId = row.session_id || row.visitor_id || `anon-${anonymousCounter++}`;
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

export class AnalyticsService {
  private ordersRepo: OrdersRepository;
  private pageviewsRepo: SitePageviewsRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.pageviewsRepo = new SitePageviewsRepository(supabase);
  }

  async trackPageview(payload: {
    path: string;
    referrer: string | null;
    visitorId: string;
    sessionId: string;
    userId: string | null;
  }) {
    await this.pageviewsRepo.insert({
      path: payload.path,
      referrer: payload.referrer,
      visitor_id: payload.visitorId,
      session_id: payload.sessionId,
      user_id: payload.userId,
    });
  }

  async getAdminAnalytics(rangeKey: string) {
    const days = rangeDays[rangeKey] ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.ordersRepo.listOrdersForAnalytics({
      status: ["paid", "shipped", "refunded", "partially_refunded"],
      since: startDate.toISOString(),
    });

    const pageviewRows = await this.pageviewsRepo.listSince(startDate.toISOString());

    const filtered = (orders as OrderForAnalytics[]).filter((order) => {
      if (!order.created_at) {
        return false;
      }
      return new Date(order.created_at) >= startDate;
    });

    let revenue = 0;
    let profit = 0;
    let orderCount = 0;
    const trendMap = new Map<string, number>();

    filtered.forEach((order) => {
      orderCount += 1;
      const netRevenue = getOrderNetRevenueDollars(order.total, order.refund_amount);
      const netProfit = getOrderNetProfitDollars({
        subtotal: order.subtotal,
        total: order.total,
        refundAmountRaw: order.refund_amount,
        items: order.items,
        resolveUnitCost: (item) => Number(item.unit_cost ?? 0),
      });

      revenue += netRevenue;
      profit += netProfit;

      const dateKey = toDateKey(order.created_at);
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + netRevenue);
    });

    const salesTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, revenue: Math.round(value * 100) / 100 }));

    const traffic = computeTraffic(pageviewRows as PageviewRow[], startDate, days);

    return {
      summary: {
        revenue,
        profit,
        orders: orderCount,
      },
      salesTrend,
      trafficSummary: traffic.summary,
      trafficTrend: traffic.trafficTrend,
    };
  }
}
