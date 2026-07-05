// src/modules/dashboard/presentation/admin/AdminLineChart.tsx
"use client";

import { useMemo } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

import {
  formatDateShort,
  getLineChartYAxis,
  normalizeLineChartData,
  toNumber,
  type NormalizedLineChartRow,
} from "@/modules/dashboard/presentation/admin/adminLineChartData";
import { useAdminLineChartSizing } from "@/modules/dashboard/presentation/admin/useAdminLineChartSizing";

type AdminLineChartProps<T extends Record<string, unknown>> = {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  height?: number;
  yLabel?: string;
  seriesName?: string;
  stroke?: string;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
};

export function AdminLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  height = 320,
  yLabel,
  seriesName,
  stroke = "#ef4444",
  valueFormatter,
  emptyLabel = "No data for this range yet.",
}: AdminLineChartProps<T>) {
  const {
    chartHeight,
    chartMargin,
    containerRef,
    containerSize,
    isCompact,
    tickFontSize,
    yAxisWidth,
  } = useAdminLineChartSizing(height);

  const normalized = useMemo<NormalizedLineChartRow<T>[]>(
    () => normalizeLineChartData(data, xKey, yKey),
    [data, xKey, yKey],
  );

  const fmt = valueFormatter ?? ((v: number) => String(v));
  const displayName = seriesName ?? yLabel ?? "Value";

  const yAxis = useMemo(() => getLineChartYAxis(normalized, fmt), [normalized, fmt]);

  if (normalized.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-brand-border bg-brand-page"
        style={{ height: chartHeight }}
      >
        <div className="text-center space-y-2">
          <div className="font-medium text-brand-text">Nothing to chart</div>
          <div className="text-sm text-brand-muted">{emptyLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div
        ref={containerRef}
        style={{ height: chartHeight, minHeight: chartHeight }}
        className="w-full min-w-0"
      >
        <LineChart
          width={Math.max(1, containerSize.width)}
          height={Math.max(1, containerSize.height)}
          data={normalized}
          margin={chartMargin}
        >
          <CartesianGrid strokeDasharray="3 6" opacity={0.25} />
          <XAxis
            dataKey="__x"
            tickFormatter={formatDateShort}
            axisLine={false}
            tickLine={false}
            minTickGap={18}
            tick={{ fontSize: tickFontSize }}
          />
          <YAxis
            domain={yAxis.domain}
            ticks={yAxis.ticks}
            allowDecimals={yAxis.allowDecimals}
            tickFormatter={(v) => fmt(toNumber(v))}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
            tick={{ fontSize: tickFontSize }}
            label={
              yLabel && !isCompact
                ? { value: yLabel, angle: -90, position: "insideLeft", offset: 6 }
                : undefined
            }
          />
          <Tooltip
            formatter={(v) => [fmt(toNumber(v)), displayName]}
            labelFormatter={(l) => `Date: ${formatDateShort(l)}`}
            contentStyle={{
              background: "rgba(255, 255, 255, 0.96)",
              border: "1px solid rgba(224, 224, 224, 1)",
              borderRadius: 0,
            }}
            itemStyle={{ color: "rgba(17, 17, 17, 0.92)" }}
            labelStyle={{ color: "rgba(17, 17, 17, 0.92)" }}
          />
          <Line
            type="monotone"
            dataKey="__y"
            name={displayName}
            stroke={stroke}
            strokeWidth={2}
            dot={normalized.length === 1}
            activeDot={{ r: 4, stroke }}
          />
        </LineChart>
      </div>
    </div>
  );
}
