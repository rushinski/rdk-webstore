// src/components/admin/charts/SalesChart.tsx
"use client";

import React from "react";
import { AdminLineChart } from "./AdminLineChart";

export function SalesChart(props: { data: Array<{ date: string; revenue: number }> }) {
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  return (
    <AdminLineChart
      data={props.data || []}
      xKey="date"
      yKey="revenue"
      yLabel="Revenue"
      seriesName="Revenue"
      stroke="#ef4444"
      valueFormatter={(v) => money.format(v)}
      emptyLabel="No revenue recorded for this range yet."
    />
  );
}
