"use client";

import { createElement } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { buildAdminDashboardStats } from "@/modules/dashboard/presentation/admin/adminDashboardView";
import { SalesChart } from "@/modules/dashboard/presentation/admin/SalesChart";
import { useAdminDashboardData } from "@/modules/dashboard/presentation/admin/useAdminDashboardData";

export function AdminDashboardScreen() {
  const { productsCount, recentOrders, salesTrend, summary } = useAdminDashboardData();
  const stats = buildAdminDashboardStats({ productsCount, recentOrders, summary });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Welcome back. Here is your current store activity."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const icon = stat.icon;

          return (
            <div key={stat.title} className="space-y-2">
              <div className="relative">
                <div className="absolute right-4 top-4">
                  {createElement(icon, { className: "h-5 w-5 text-brand-muted" })}
                </div>
                <AdminMetricCard
                  label={stat.title}
                  value={stat.value}
                  detail={stat.change}
                />
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-700" />
                )}
                <span
                  className={stat.trend === "up" ? "text-emerald-700" : "text-red-700"}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <AdminSectionCard title="Recent Sales">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-text">Recent Sales</h2>
          <Link
            href="/admin/sales"
            className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:text-neutral-600"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="py-3 text-left text-sm font-semibold text-brand-muted">
                  Order
                </th>
                <th className="hidden py-3 text-left text-sm font-semibold text-brand-muted sm:table-cell">
                  Customer
                </th>
                <th className="py-3 text-right text-sm font-semibold text-brand-muted">
                  Amount
                </th>
                <th className="hidden py-3 text-right text-sm font-semibold text-brand-muted sm:table-cell">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-brand-border">
                  <td className="py-3 text-brand-text">#{order.id.slice(0, 8)}</td>
                  <td className="hidden py-3 text-brand-muted sm:table-cell">
                    {order.user_id ? order.user_id.slice(0, 6) : "Guest"}
                  </td>
                  <td className="py-3 text-right text-brand-text">
                    ${Number(order.total ?? 0).toFixed(2)}
                  </td>
                  <td className="hidden py-3 text-right text-emerald-700 sm:table-cell">
                    +${Number(order.subtotal ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>

      <div className="grid grid-cols-1 gap-6">
        <AdminSectionCard title="Financials">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-text">Financials</h2>
            <span className="text-sm text-brand-muted">7d</span>
          </div>
          <SalesChart data={salesTrend} />
        </AdminSectionCard>
      </div>
    </div>
  );
}
