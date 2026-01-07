// src/components/admin/charts/TrafficChart.tsx
"use client";

import React from "react";
import { AdminLineChart } from "./AdminLineChart";

export function TrafficChart(props: { data: Array<{ date: string; visits: number }> }) {
  const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  return (
    <AdminLineChart
      data={props.data || []}
      xKey="date"
      yKey="visits"
      yLabel="Visits"
      seriesName="Visits"
      stroke="#ef4444"
      valueFormatter={(v) => whole.format(v)}
      emptyLabel="No traffic recorded for this range yet."
    />
  );
}
