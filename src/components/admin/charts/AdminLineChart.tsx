// src/components/admin/charts/AdminLineChart.tsx
"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type AdminLineChartProps<T extends Record<string, unknown>> = {
  data: T[];
  xKey: keyof T; // typically "date"
  yKey: keyof T; // "revenue" | "visits"
  height?: number; // default 320
  yLabel?: string;
  seriesName?: string; // what shows in tooltip
  stroke?: string; // line color
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatDateShort(input: unknown) {
  const s = typeof input === "string" ? input : "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

export function AdminLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  height = 320,
  yLabel,
  seriesName,
  stroke = "#ef4444", // red-500
  valueFormatter,
  emptyLabel = "No data for this range yet.",
}: AdminLineChartProps<T>) {
  const normalized = useMemo(() => {
    return (data || [])
      .map((row) => ({
        ...row,
        __x: row[xKey],
        __y: toNumber(row[yKey]),
      }))
      .sort((a, b) => {
        const da = new Date(String(a.__x)).getTime();
        const db = new Date(String(b.__x)).getTime();
        if (Number.isNaN(da) || Number.isNaN(db)) return 0;
        return da - db;
      });
  }, [data, xKey, yKey]);

  // Only empty-state when there are literally zero points.
  if (normalized.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-zinc-800/70 rounded-lg bg-zinc-950/40"
        style={{ height }}
      >
        <div className="text-center space-y-2">
          <div className="text-white/90 font-medium">Nothing to chart</div>
          <div className="text-sm text-gray-400">{emptyLabel}</div>
        </div>
      </div>
    );
  }

  const fmt = valueFormatter ?? ((v: number) => String(v));
  const displayName = seriesName ?? yLabel ?? "Value";

  return (
    <div className="w-full">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={normalized} margin={{ top: 8, right: 18, bottom: 8, left: 12 }}>
            <CartesianGrid strokeDasharray="3 6" opacity={0.25} />
            <XAxis
              dataKey="__x"
              tickFormatter={formatDateShort}
              axisLine={false}
              tickLine={false}
              minTickGap={18}
            />
            <YAxis
              tickFormatter={(v) => fmt(toNumber(v))}
              axisLine={false}
              tickLine={false}
              width={84}
              label={
                yLabel
                  ? { value: yLabel, angle: -90, position: "insideLeft", offset: 6 }
                  : undefined
              }
            />
            <Tooltip
              formatter={(v) => [fmt(toNumber(v)), displayName]}
              labelFormatter={(l) => `Date: ${formatDateShort(l)}`}
              contentStyle={{
                background: "rgba(9, 9, 11, 0.92)",
                border: "1px solid rgba(39, 39, 42, 0.7)",
                borderRadius: 10,
              }}
              itemStyle={{ color: "rgba(244, 244, 245, 0.9)" }}
              labelStyle={{ color: "rgba(244, 244, 245, 0.9)" }}
            />
            <Line
              type="monotone"
              dataKey="__y"
              name={displayName} // prevents "y" label
              stroke={stroke}    // red line
              strokeWidth={2}
              dot={normalized.length === 1} // today: single dot
              activeDot={{ r: 4, stroke }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
