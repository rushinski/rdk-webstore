"use client";

import { createElement, useEffect, useState } from "react";
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { SalesChart } from "@/components/admin/charts/SalesChart";
import { TrafficChart } from "@/components/admin/charts/TrafficChart";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { logError } from "@/lib/utils/log";

type RecentOrder = {
  id: string;
  user_id?: string | null;
  total?: number | null;
  subtotal?: number | null;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState({ revenue: 0, orders: 0 });
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; revenue: number }>>(
    [],
  );
  const [trafficSummary, setTrafficSummary] = useState({
    visits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
  });
  const [trafficTrend, setTrafficTrend] = useState<
    Array<{ date: string; visits: number }>
  >([]);
  const [productsCount, setProductsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [analyticsResponse, productsResponse, ordersResponse] = await Promise.all([
          fetch("/api/admin/analytics?range=7d"),
          fetch("/api/store/products?limit=1"),
          fetch("/api/admin/orders?status=paid&status=shipped"),
        ]);

        const analyticsData = await analyticsResponse.json();
        if (analyticsResponse.ok) {
          setSummary({
            revenue: analyticsData.summary?.revenue ?? 0,
            orders: analyticsData.summary?.orders ?? 0,
          });
          setSalesTrend(analyticsData.salesTrend || []);
          setTrafficSummary(
            analyticsData.trafficSummary || {
              visits: 0,
              uniqueVisitors: 0,
              pageViews: 0,
            },
          );
          setTrafficTrend(analyticsData.trafficTrend || []);
        }

        const productsData = await productsResponse.json();
        setProductsCount(productsData.total ?? 0);

        const ordersData = await ordersResponse.json();
        setRecentOrders((ordersData.orders || []).slice(0, 3));
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_dashboard" });
      }
    };

    void loadDashboard();
  }, []);

  const stats = [
    {
      title: "Revenue",
      value: `$${summary.revenue.toFixed(2)}`,
      change: "-",
      trend: summary.revenue > 0 ? "up" : "down",
      icon: DollarSign,
    },
    {
      title: "Orders",
      value: `${summary.orders}`,
      change: "-",
      trend: summary.orders > 0 ? "up" : "down",
      icon: ShoppingCart,
    },
    {
      title: "Products",
      value: `${productsCount}`,
      change: "-",
      trend: productsCount > 0 ? "up" : "down",
      icon: Package,
    },
    {
      title: "Visitors",
      value: `${trafficSummary.uniqueVisitors}`,
      change: "-",
      trend: trafficSummary.uniqueVisitors > 0 ? "up" : "down",
      icon: Users,
    },
  ] as const;

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Financials">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-text">Financials</h2>
            <span className="text-sm text-brand-muted">7d</span>
          </div>
          <SalesChart data={salesTrend} />
        </AdminSectionCard>

        <AdminSectionCard title="Traffic">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-text">Traffic</h2>
            <span className="text-sm text-brand-muted">7d</span>
          </div>
          <TrafficChart data={trafficTrend} />
        </AdminSectionCard>
      </div>
    </div>
  );
}
