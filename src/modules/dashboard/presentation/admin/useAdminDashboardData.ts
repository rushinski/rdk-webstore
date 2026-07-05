"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";

export type AdminDashboardSummary = {
  revenue: number;
  orders: number;
};

export type AdminDashboardSalesTrendPoint = {
  date: string;
  revenue: number;
};

export type AdminDashboardRecentOrder = {
  id: string;
  user_id?: string | null;
  total?: number | null;
  subtotal?: number | null;
  created_at?: string | null;
};

const buildSalesTrend = (orders: AdminDashboardRecentOrder[]): AdminDashboardSalesTrendPoint[] => {
  const today = new Date();
  const buckets = new Map<string, number>();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }

  orders.forEach((order) => {
    if (!order.created_at) {
      return;
    }

    const key = new Date(order.created_at).toISOString().slice(0, 10);
    if (!buckets.has(key)) {
      return;
    }

    buckets.set(key, (buckets.get(key) ?? 0) + Number(order.total ?? 0));
  });

  return Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue }));
};

export function useAdminDashboardData() {
  const [summary, setSummary] = useState<AdminDashboardSummary>({
    revenue: 0,
    orders: 0,
  });
  const [salesTrend, setSalesTrend] = useState<AdminDashboardSalesTrendPoint[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<AdminDashboardRecentOrder[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [productsResponse, ordersResponse] = await Promise.all([
          fetch("/api/store/products?limit=1"),
          fetch("/api/admin/orders?status=paid&status=shipped"),
        ]);

        const productsData = await productsResponse.json();
        setProductsCount(productsData.total ?? 0);

        const ordersData = await ordersResponse.json();
        const orders = (ordersData.orders || []) as AdminDashboardRecentOrder[];
        const paidOrders = orders.filter((order) => Number(order.total ?? 0) > 0);
        const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

        setSummary({
          revenue,
          orders: paidOrders.length,
        });
        setSalesTrend(buildSalesTrend(paidOrders));
        setRecentOrders(orders.slice(0, 3));
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_dashboard" });
      }
    };

    void loadDashboard();
  }, []);

  return {
    productsCount,
    recentOrders,
    salesTrend,
    summary,
  };
}
