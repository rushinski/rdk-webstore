import {
  DollarSign,
  Package,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

import type {
  AdminDashboardRecentOrder,
  AdminDashboardSummary,
} from "@/components/admin/dashboard/useAdminDashboardData";

export type AdminDashboardStat = {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
};

export function buildAdminDashboardStats({
  productsCount,
  recentOrders,
  summary,
}: {
  productsCount: number;
  recentOrders: AdminDashboardRecentOrder[];
  summary: AdminDashboardSummary;
}): AdminDashboardStat[] {
  return [
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
      title: "Recent Orders",
      value: `${recentOrders.length}`,
      change: "-",
      trend: recentOrders.length > 0 ? "up" : "down",
      icon: Receipt,
    },
  ];
}
