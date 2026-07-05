"use client";

import { AdminMetricCard } from "@/modules/shared/presentation/admin/ui/AdminMetricCard";

type PickupsSummary = {
  profit: number;
  revenue: number;
  totalSales: number;
};

type PickupsSummaryCardsProps = {
  summary: PickupsSummary;
};

export function PickupsSummaryCards({ summary }: PickupsSummaryCardsProps) {
  const compactNumber = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const compactMoney = (value: number) => `$${compactNumber.format(value)}`;

  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-3 sm:gap-6">
      <AdminMetricCard
        label="Total Sales"
        value={
          summary.totalSales > 999
            ? compactNumber.format(summary.totalSales)
            : `${summary.totalSales}`
        }
      />
      <AdminMetricCard
        label="Revenue"
        value={
          summary.revenue > 999
            ? compactMoney(summary.revenue)
            : `$${summary.revenue.toFixed(2)}`
        }
      />
      <div className="border border-brand-border bg-brand-surface p-4 shadow-[0_16px_50px_rgba(17,17,17,0.04)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
          Profit
        </div>
        <div
          className={`mt-3 text-3xl font-bold ${
            summary.profit >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {summary.profit > 999
            ? compactMoney(summary.profit)
            : `$${summary.profit.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}

