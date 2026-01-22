"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { logError } from "@/lib/log";
import { TrafficChart } from "@/components/admin/charts/TrafficChart";
import { RdkSelect } from "@/components/ui/Select";
import { Users, Eye } from "lucide-react";

type Range = "today" | "7d" | "30d" | "90d";
const DEFAULT_RANGE: Range = "30d";
const POLL_MS = 30_000;

function rangeToDays(range: Range): number {
  if (range === "today") return 1;
  return Number(range.replace("d", "")) || 30;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type DailySeriesPoint<K extends string> = { date: string } & Record<K, number>;

function normalizeDailySeries<K extends string>(
  range: Range,
  raw: Array<{ date: string } & Partial<Record<K, number>>>,
  valueKey: K
): DailySeriesPoint<K>[] {
  const days = rangeToDays(range);

  // Build a map from YYYY-MM-DD -> value
  const map = new Map<string, number>();
  for (const row of raw || []) {
    const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
    const v = Number(row[valueKey] ?? 0);
    if (!date) continue;
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


export default function AnalyticsTrafficPage() {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [trafficSummary, setTrafficSummary] = useState({
    visits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
  });
  const [trafficTrendRaw, setTrafficTrendRaw] = useState<Array<{ date: string; visits: number }>>(
    []
  );

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
        setTrafficSummary(data.trafficSummary || { visits: 0, uniqueVisitors: 0, pageViews: 0 });
        setTrafficTrendRaw(data.trafficTrend || []);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      logError(error, { layer: "frontend", event: "admin_load_analytics_traffic" });
    }
  };

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const trafficTrend = useMemo(() => {
    return normalizeDailySeries(range, trafficTrendRaw, "visits");
  }, [range, trafficTrendRaw]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Traffic performance</p>
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
        <h2 className="text-2xl font-semibold text-white mb-4">Traffic</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Visits</span>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{trafficSummary.visits}</div>
            <div className="text-gray-500 text-sm mt-2">
              {range === "today" ? "Today" : `Last ${range.replace("d", "")} days`}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Unique Visitors</span>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{trafficSummary.uniqueVisitors}</div>
            <div className="text-gray-500 text-sm mt-2">
              {range === "today" ? "Today" : `Last ${range.replace("d", "")} days`}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Page Views</span>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{trafficSummary.pageViews}</div>
            <div className="text-gray-500 text-sm mt-2">
              {range === "today" ? "Today" : `Last ${range.replace("d", "")} days`}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Daily Traffic</h3>
          <TrafficChart data={trafficTrend} />
        </div>
      </div>
    </div>
  );
}
