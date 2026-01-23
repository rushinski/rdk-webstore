// app/admin/analytics/financials/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DollarSign, TrendingUp, ShoppingCart } from "lucide-react";

import { logError } from "@/lib/log";
import { SalesChart } from "@/components/admin/charts/SalesChart";
import { RdkSelect } from "@/components/ui/Select";

type Range = "today" | "7d" | "30d" | "90d";
const DEFAULT_RANGE: Range = "30d";
const POLL_MS = 30_000;

function rangeToDays(range: Range): number {
  if (range === "today") {
    return 1;
  }
  return Number(range.replace("d", "")) || 30;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type DailySeriesPoint<K extends string> = { date: string } & Record<K, number>;

function normalizeDailySeries<K extends string>(
  range: Range,
  raw: Array<{ date: string } & Partial<Record<K, number>>>,
  valueKey: K,
): DailySeriesPoint<K>[] {
  const days = rangeToDays(range);

  // Build a map from YYYY-MM-DD -> value
  const map = new Map<string, number>();
  for (const row of raw || []) {
    const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
    const v = Number(row[valueKey] ?? 0);
    if (!date) {
      continue;
    }
    map.set(date, (map.get(date) ?? 0) + (Number.isFinite(v) ? v : 0));
  }

  // End at "today" (UTC day). Start is (days-1) days back.
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const out: DailySeriesPoint<K>[] = [];
  for (let i = 0; i < days; i++) {
    const cur = new Date(start);
    cur.setUTCDate(start.getUTCDate() + i);
    const key = toISODate(cur);

    out.push({
      date: key,
      [valueKey]: map.get(key) ?? 0,
    } as DailySeriesPoint<K>);
  }

  return out;
}

export default function AnalyticsFinancialsPage() {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, orders: 0 });
  const [salesTrendRaw, setSalesTrendRaw] = useState<
    Array<{ date: string; revenue: number }>
  >([]);

  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    try {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary || { revenue: 0, profit: 0, orders: 0 });
        setSalesTrendRaw(data.salesTrend || []);
      }
    } catch (error: any) {
      // Ignore abort noise
      if (error?.name === "AbortError") {
        return;
      }
      logError(error, { layer: "frontend", event: "admin_load_analytics_financials" });
    }
  };

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      // Only poll when tab is visible (keeps it snappy and cheaper)
      if (document.visibilityState === "visible") {
        load();
      }
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const salesTrend = useMemo(() => {
    // Normalize to match the selected range window so the chart always
    // has the same amount of days as traffic (unless the filter changes).
    return normalizeDailySeries(range, salesTrendRaw, "revenue");
  }, [range, salesTrendRaw]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Financial performance</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-48">
          <RdkSelect
            value={range}
            onChange={(value) => setRange(value as Range)}
            options={[
              { value: "today", label: "Today" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">Financials</h2>

        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-6 mb-6">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-3 sm:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-[10px] sm:text-sm">Revenue</span>
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <div className="mt-auto space-y-1">
              <div className="text-base sm:text-3xl font-bold text-white">
                ${summary.revenue.toFixed(2)}
              </div>
              <div className="text-gray-500 text-[10px] sm:text-sm">
                {range === "today" ? "Today" : `Last ${range.replace("d", "")} days`}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-3 sm:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-[10px] sm:text-sm">Profit</span>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <div className="mt-auto space-y-1">
              <div className="text-base sm:text-3xl font-bold text-white">
                ${summary.profit.toFixed(2)}
              </div>
              <div className="text-gray-500 text-[10px] sm:text-sm">
                {range === "today" ? "Today" : `Last ${range.replace("d", "")} days`}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-3 sm:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-[10px] sm:text-sm">Orders</span>
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <div className="mt-auto space-y-1">
              <div className="text-base sm:text-3xl font-bold text-white">
                {summary.orders}
              </div>
              <div className="text-gray-500 text-[10px] sm:text-sm">
                {range === "today" ? "Today" : `Last ${range.replace("d", "")} days`}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Revenue Trend</h3>
          <SalesChart data={salesTrend} />
        </div>
      </div>
    </div>
  );
}
