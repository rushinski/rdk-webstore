// src/components/admin/AdminSidebar.tsx
"use client";

import { createElement, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  Settings,
  Globe,
  X,
  Menu,
  ChevronDown,
  ChevronRight,
  Receipt,
  Star,
  type LucideIcon,
} from "lucide-react";

import type { ProfileRole } from "@/config/constants/roles";
import { Tooltip } from "@/components/ui/Tooltip";
import { AdminBrandHeader } from "@/components/admin/shell/AdminBrandHeader";
import { AdminNavItem } from "@/components/admin/shell/AdminNavItem";

type NavLinkItem = {
  type: "link";
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroupItem = {
  type: "group";
  label: string;
  icon: LucideIcon;
  groupKey: "analytics" | "orders" | "settings";
  isActive: (pathname: string) => boolean;
  children: Array<{ href: string; label: string }>;
};

const navItems: Array<NavLinkItem | NavGroupItem> = [
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

export function AdminSidebar({
  userEmail: _userEmail,
  role: _role,
}: {
  userEmail?: string | null;
  role: ProfileRole;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const analyticsActive = pathname.startsWith("/admin/analytics");
  const ordersActive =
    pathname.startsWith("/admin/transactions") ||
    pathname.startsWith("/admin/customers") ||
    pathname.startsWith("/admin/shipping") ||
    pathname.startsWith("/admin/pickups");
  const settingsActive = pathname.startsWith("/admin/settings");
  const [openGroups, setOpenGroups] = useState({
    analytics: false,
    orders: false,
    settings: false,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Auto-open group when you're inside it
  useEffect(() => {
    if (analyticsActive) {
      setOpenGroups((prev) => ({ ...prev, analytics: true }));
    }
    if (ordersActive) {
      setOpenGroups((prev) => ({ ...prev, orders: true }));
    }
    if (settingsActive) {
      setOpenGroups((prev) => ({ ...prev, settings: true }));
    }
  }, [analyticsActive, ordersActive, settingsActive]);

  function SidebarContent() {
    const baseItemClass =
      "group flex items-center gap-3 border border-transparent px-4 py-3 " +
      "bg-transparent transition-colors hover:bg-brand-page";

    const activeItemClass = "border-brand-text bg-brand-text text-brand-surface";
    const inactiveItemClass = "text-brand-text";

    const inAdmin = pathname.startsWith("/admin");

    const statusBase =
      "flex w-full items-center gap-2 px-3 py-2 rounded-sm select-none " +
      "text-[12px] sm:text-[13px] leading-none bg-brand-text text-brand-surface";

    return (
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 admin-sidebar-scroll">
          {/* Workspace Indicator (visual only) */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-brand-muted">
              Workspace
            </div>

            <div className={statusBase} aria-current="page">
              {inAdmin ? (
                <>
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="font-medium">Admin</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span className="font-medium">Website</span>
                </>
              )}
            </div>

            <div className="mt-4 border-t border-brand-border" />
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.type === "link") {
                const icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <div key={item.href}>
                    <AdminNavItem
                      href={item.href}
                      label={item.label}
                      icon={icon}
                      isActive={isActive}
                      onClick={() => setIsOpen(false)}
                    />
                  </div>
                );
              }

              // group
              const icon = item.icon;
              const isGroupActive = item.isActive(pathname);
              const isGroupOpen = openGroups[item.groupKey];
              const chevron = isGroupOpen ? ChevronDown : ChevronRight;

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [item.groupKey]: !prev[item.groupKey],
                      }))
                    }
                    className={`${baseItemClass} w-full justify-between ${
                      isGroupActive ? activeItemClass : inactiveItemClass
                    }`}
                    aria-expanded={isGroupOpen}
                    aria-controls={`admin-${item.groupKey}-subnav`}
                  >
                    <span className="flex items-center gap-3">
                      {createElement(icon, { className: "w-5 h-5" })}
                      <span className="text-[13px] sm:text-[15px]">{item.label}</span>
                    </span>
                    {createElement(chevron, { className: "w-4 h-4 opacity-80" })}
                  </button>

                  {isGroupOpen && (
                    <div
                      id={`admin-${item.groupKey}-subnav`}
                      className="ml-4 space-y-1 border-l border-brand-border pl-3"
                    >
                      {item.children.map((child) => {
                        const isActive = pathname.startsWith(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center px-3 py-2 border border-transparent rounded-sm transition-colors ${
                              isActive
                                ? "border-brand-text bg-brand-text text-brand-surface"
                                : "text-brand-text hover:bg-brand-page"
                            }`}
                          >
                            <span className="text-[12px] sm:text-[14px]">
                              {child.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom dock */}
        <div className="sticky bottom-0 left-0 w-full flex-none self-stretch">
          {/* Full-width divider */}
          <div className="-mx-6 w-[calc(100%+3rem)] border-t border-brand-border" />

          {/* Dock background spans edge-to-edge (cancels parent p-6) */}
          <div className="-mx-6 w-[calc(100%+3rem)] bg-brand-surface px-6 py-3">
            <div className="grid w-full grid-cols-1 items-center">
              {/* Profile */}
              <Tooltip label="Profile" side="top">
                <Link
                  href="/admin/profile"
                  onClick={() => setIsOpen(false)}
                  aria-label="Profile"
                  className="flex h-12 w-full items-center justify-center rounded-sm
                            transition-colors hover:bg-brand-page
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/20"
                >
                  <User className="h-5 w-5 text-brand-muted transition-colors group-hover:text-brand-text" />
                </Link>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-5 top-5 z-40 border border-brand-border bg-brand-surface p-3 text-brand-text shadow-lg md:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-brand-surface overscroll-contain md:hidden">
          <div className="px-6 pt-6 pb-0 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold uppercase tracking-[0.08em] text-brand-text">
                Admin Menu
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-brand-muted hover:text-brand-text"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-brand-border bg-brand-surface md:block">
        <AdminBrandHeader />
        <div className="p-6">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
