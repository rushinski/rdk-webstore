// src/components/admin/charts/AdminLineChart.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

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

function toNumber(v: unknown): number {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatDateShort(input: unknown) {
  const s = typeof input === "string" ? input : "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return s || "";
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  const exp = Math.floor(Math.log10(raw));
  const f = raw / Math.pow(10, exp);

  let nf = 1;
  if (f <= 1) {
    nf = 1;
  } else if (f <= 2) {
    nf = 2;
  } else if (f <= 5) {
    nf = 5;
  } else {
    nf = 10;
  }

  return nf * Math.pow(10, exp);
}

function genTicks(min: number, max: number, step: number) {
  const out: number[] = [];
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(step) ||
    step <= 0
  ) {
    return out;
  }

  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const MAX_TICKS = 12_000;
  let count = 0;

  for (let v = start; v <= end + step / 2; v += step) {
    out.push(Number(v.toFixed(12)));
    count++;
    if (count > MAX_TICKS) {
      break;
    }
  }

  return Array.from(new Set(out)).sort((a, b) => a - b);
}

function hasDuplicateLabels(values: number[], fmt: (n: number) => string) {
  const labels = values.map((v) => fmt(v));
  return new Set(labels).size !== labels.length;
}

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
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const chartHeight = isCompact ? Math.max(220, Math.round(height * 0.8)) : height;
  const yAxisWidth = isCompact ? 60 : 84;
  const tickFontSize = isCompact ? 10 : 12;
  const chartMargin = isCompact
    ? { top: 8, right: 12, bottom: 6, left: 4 }
    : { top: 8, right: 18, bottom: 8, left: 12 };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setIsCompact(media.matches);
    handleChange();

    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let raf = 0;
    const update = () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const parentWidth = el.parentElement?.clientWidth ?? 0;
        const width = Math.max(
          1,
          Math.floor(el.clientWidth || rect.width || parentWidth),
        );
        const height = Math.max(
          1,
          Math.floor(el.clientHeight || rect.height || chartHeight),
        );
        const next = { width, height };
        setContainerSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next,
        );
      });
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => {
        observer.disconnect();
        if (raf) {
          cancelAnimationFrame(raf);
        }
      };
    }

    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [chartHeight, data.length]);

  const normalized = useMemo(() => {
    return (data || [])
      .map((row) => ({
        ...row,
        __x: row[xKey],
        __y: toNumber(row[yKey]),
      }))
      .sort((a, b) => {
        const da = new Date(String((a as any).__x)).getTime();
        const db = new Date(String((b as any).__x)).getTime();
        if (Number.isNaN(da) || Number.isNaN(db)) {
          return 0;
        }
        return da - db;
      });
  }, [data, xKey, yKey]);

  const fmt = valueFormatter ?? ((v: number) => String(v));
  const displayName = seriesName ?? yLabel ?? "Value";

  // IMPORTANT: This hook must run on every render (even when empty)
  const yAxis = useMemo(() => {
    // Default axis so hook is safe even when there's no data
    if (normalized.length === 0) {
      return {
        domain: [0, 1] as [number, number],
        ticks: [0, 1] as number[],
        allowDecimals: false,
      };
    }

    const yVals = normalized.map((r) => toNumber((r as any).__y));
    const yMinData = yVals.length ? Math.min(...yVals) : 0;
    const yMaxData = yVals.length ? Math.max(...yVals) : 0;

    const min = Math.min(0, yMinData);
    const max = Math.max(0, yMaxData);

    // Keep chart readable if all zeros
    const domainMax = max === 0 ? 1 : max;

    const isIntegerSeries = yVals.every((v) => Number.isInteger(v));
    const wantIntegers = isIntegerSeries;

    let step: number;

    if (wantIntegers) {
      if (domainMax <= 12) {
        step = 1;
      } else {
        step = Math.max(1, niceStep((domainMax - min) / 5));
      }
    } else {
      step = niceStep((domainMax - min) / 5);
    }

    let ticks = genTicks(min, domainMax, step);

    // If formatter collapses values into duplicate labels (ex: 0.2 and 0.4 both show "0"),
    // increase step until labels are unique.
    let attempts = 0;
    while (ticks.length > 2 && hasDuplicateLabels(ticks, fmt) && attempts < 8) {
      step *= 2;
      ticks = genTicks(min, domainMax, step);
      attempts++;
    }

    // Cap tick count for readability
    const MAX_TICKS_SHOWN = 12;
    if (ticks.length > MAX_TICKS_SHOWN) {
      const stride = Math.ceil(ticks.length / MAX_TICKS_SHOWN);
      ticks = ticks.filter((_, idx) => idx % stride === 0);
      if (ticks[ticks.length - 1] !== domainMax) {
        ticks.push(domainMax);
      }
    }

    return {
      domain: [min, domainMax] as [number, number],
      ticks,
      allowDecimals: !wantIntegers,
    };
  }, [normalized, fmt]);

  // Now it's safe to return early (hooks already ran)
  if (normalized.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-zinc-800/70 rounded-lg bg-zinc-950/40"
        style={{ height: chartHeight }}
      >
        <div className="text-center space-y-2">
          <div className="text-white/90 font-medium">Nothing to chart</div>
          <div className="text-sm text-gray-400">{emptyLabel}</div>
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
