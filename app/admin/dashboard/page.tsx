// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
} from "lucide-react";
import Link from "next/link";

import { logError } from "@/lib/log";
import { SalesChart } from "@/components/admin/charts/SalesChart";
import { TrafficChart } from "@/components/admin/charts/TrafficChart";

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
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

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

    loadDashboard();
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-zinc-900 border border-zinc-800/70 rounded p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">{stat.title}</span>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl sm:text-3xl font-bold text-white">
                  {stat.value}
                </span>
                <span
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    stat.trend === "up" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sales */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Sales</h2>
          <Link href="/admin/sales" className="text-red-500 hover:underline text-sm">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/70">
                <th className="text-left text-gray-400 font-semibold py-3">Order</th>
                <th className="hidden sm:table-cell text-left text-gray-400 font-semibold py-3">
                  Customer
                </th>
                <th className="text-right text-gray-400 font-semibold py-3">Amount</th>
                <th className="hidden sm:table-cell text-right text-gray-400 font-semibold py-3">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-zinc-800/70">
                  <td className="py-3 text-white">#{order.id.slice(0, 8)}</td>
                  <td className="hidden sm:table-cell py-3 text-gray-400">
                    {order.user_id ? order.user_id.slice(0, 6) : "Guest"}
                  </td>
                  <td className="py-3 text-right text-white">
                    ${Number(order.total ?? 0).toFixed(2)}
                  </td>
                  <td className="hidden sm:table-cell py-3 text-right text-green-400">
                    +${Number(order.subtotal ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Financials</h2>
            <span className="text-sm text-gray-400">7d</span>
          </div>
          <SalesChart data={salesTrend} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Traffic</h2>
            <span className="text-sm text-gray-400">7d</span>
          </div>
          <TrafficChart data={trafficTrend} />
        </div>
      </div>
    </div>
  );
}
