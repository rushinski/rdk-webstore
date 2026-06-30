"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Users } from "lucide-react";

import { TrafficChart } from "@/components/admin/charts/TrafficChart";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { RdkSelect } from "@/components/ui/Select";
import { logError } from "@/lib/utils/log";

type Range = "today" | "7d" | "30d" | "90d";

const DEFAULT_RANGE: Range = "30d";
const POLL_MS = 30_000;

function rangeToDays(range: Range): number {
  if (range === "today") {
    return 1;
  }

  return Number(range.replace("d", "")) || 30;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRangeLabel(range: Range) {
  return range === "today" ? "Today" : `Last ${range.replace("d", "")} days`;
}

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
};

type DailySeriesPoint<K extends string> = { date: string } & Record<K, number>;

function normalizeDailySeries<K extends string>(
  range: Range,
  raw: Array<{ date: string } & Partial<Record<K, number>>>,
  valueKey: K,
): DailySeriesPoint<K>[] {
  const days = rangeToDays(range);
  const map = new Map<string, number>();

  for (const row of raw || []) {
    const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
    const value = Number(row[valueKey] ?? 0);

    if (!date) {
      continue;
    }

    map.set(date, (map.get(date) ?? 0) + (Number.isFinite(value) ? value : 0));
  }

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const output: DailySeriesPoint<K>[] = [];

  for (let index = 0; index < days; index++) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const key = toISODate(current);

    output.push({
      date: key,
      [valueKey]: map.get(key) ?? 0,
    } as DailySeriesPoint<K>);
  }

  return output;
}

export default function AnalyticsTrafficPage() {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [trafficSummary, setTrafficSummary] = useState({
    visits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
  });
  const [trafficTrendRaw, setTrafficTrendRaw] = useState<
    Array<{ date: string; visits: number }>
  >([]);

  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.ok) {
        setTrafficSummary(
          data.trafficSummary || { visits: 0, uniqueVisitors: 0, pageViews: 0 },
        );
        setTrafficTrendRaw(data.trafficTrend || []);
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      logError(error, { layer: "frontend", event: "admin_load_analytics_traffic" });
    }
  };

  useEffect(() => {
    void load();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [range]);

  const trafficTrend = useMemo(
    () => normalizeDailySeries(range, trafficTrendRaw, "visits"),
    [range, trafficTrendRaw],
  );

  const rangeLabel = getRangeLabel(range);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Traffic Analytics"
        description="Visits, audience size, and page-view trends for the selected reporting window."
        actions={
          <RdkSelect
            value={range}
            onChange={(value) => setRange(value as Range)}
            options={[
              { value: "today", label: "Today" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
            className="w-48"
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="relative">
          <div className="absolute right-4 top-4">
            <Users className="h-5 w-5 text-brand-muted" />
          </div>
          <AdminMetricCard
            label="Total Visits"
            value={String(trafficSummary.visits)}
            detail={rangeLabel}
          />
        </div>

        <div className="relative">
          <div className="absolute right-4 top-4">
            <Eye className="h-5 w-5 text-brand-muted" />
          </div>
          <AdminMetricCard
            label="Unique Visitors"
            value={String(trafficSummary.uniqueVisitors)}
            detail={rangeLabel}
          />
        </div>

        <div className="relative">
          <div className="absolute right-4 top-4">
            <Eye className="h-5 w-5 text-brand-muted" />
          </div>
          <AdminMetricCard
            label="Page Views"
            value={String(trafficSummary.pageViews)}
            detail={rangeLabel}
          />
        </div>
      </div>

      <AdminSectionCard title="Trend">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-text">Daily Traffic</h2>
          <span className="text-sm text-brand-muted">{rangeLabel}</span>
        </div>

        <div className="border border-brand-border bg-brand-page p-3 sm:p-4">
          <TrafficChart data={trafficTrend} />
        </div>
      </AdminSectionCard>
    </div>
  );
}
