import {
  BarChart3,
  Globe,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type AdminSidebarGroupKey = "analytics" | "orders" | "settings";

export type AdminSidebarLinkItem = {
  type: "link";
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminSidebarGroupItem = {
  type: "group";
  label: string;
  icon: LucideIcon;
  groupKey: AdminSidebarGroupKey;
  isActive: (pathname: string) => boolean;
  children: Array<{ href: string; label: string }>;
};

export type AdminSidebarItem = AdminSidebarLinkItem | AdminSidebarGroupItem;

export const adminSidebarItems: AdminSidebarItem[] = [
  { type: "link", href: "/", label: "Website", icon: Globe },
  { type: "link", href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { type: "link", href: "/admin/inventory", label: "Inventory", icon: Package },
  {
    type: "group",
    label: "Analytics",
    icon: BarChart3,
    groupKey: "analytics",
    isActive: (pathname: string) => pathname.startsWith("/admin/analytics"),
    children: [
      { href: "/admin/analytics/traffic", label: "Traffic" },
      { href: "/admin/analytics/financials", label: "Financials" },
    ],
  },
  {
    type: "group",
    label: "Activity",
    icon: Truck,
    groupKey: "orders",
    isActive: (pathname: string) =>
      pathname.startsWith("/admin/transactions") ||
      pathname.startsWith("/admin/customers") ||
      pathname.startsWith("/admin/shipping") ||
      pathname.startsWith("/admin/pickups"),
    children: [
      { href: "/admin/transactions", label: "Transactions" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/shipping", label: "Shipping" },
      { href: "/admin/pickups", label: "Pickups" },
    ],
  },
  { type: "link", href: "/admin/nexus", label: "Tax & Nexus", icon: Receipt },
  { type: "link", href: "/admin/featured-items", label: "Featured Items", icon: Star },
  { type: "link", href: "/admin/catalog", label: "Tags", icon: Package },
  {
    type: "group",
    label: "Settings",
    icon: Settings,
    groupKey: "settings",
    isActive: (pathname: string) => pathname.startsWith("/admin/settings"),
    children: [
      { href: "/admin/settings/store-access", label: "Store Access" },
      { href: "/admin/settings/shipping", label: "Shipping" },
      { href: "/admin/settings/taxes", label: "Taxes" },
    ],
  },
];

export function getAdminSidebarActiveGroups(
  pathname: string,
): Record<AdminSidebarGroupKey, boolean> {
  return {
    analytics: pathname.startsWith("/admin/analytics"),
    orders:
      pathname.startsWith("/admin/transactions") ||
      pathname.startsWith("/admin/customers") ||
      pathname.startsWith("/admin/shipping") ||
      pathname.startsWith("/admin/pickups"),
    settings: pathname.startsWith("/admin/settings"),
  };
}
