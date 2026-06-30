// src/components/admin/AdminSidebar.tsx
"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Bell,
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  Settings,
  MessageCircle,
  Globe,
  X,
  Menu,
  ChevronDown,
  ChevronRight,
  Landmark,
  Receipt,
  Star,
  type LucideIcon,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { canViewBank } from "@/config/constants/roles";
import type { ProfileRole } from "@/config/constants/roles";
import { Tooltip } from "@/components/ui/Tooltip";
import { AdminNotificationsDrawer } from "@/components/admin/AdminNotificationsDrawer";
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

type ChatSummary = {
  id: string;
  messages?: Array<{ sender_role?: "customer" | "admin" | null }> | null;
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
  { type: "link", href: "/admin/bank", label: "Bank", icon: Landmark },
  { type: "link", href: "/admin/nexus", label: "Tax & Nexus", icon: Receipt },
  { type: "link", href: "/admin/featured-items", label: "Featured Items", icon: Star }, // ADD THIS LINE
  { type: "link", href: "/admin/catalog", label: "Tags", icon: Package },
  {
    type: "group",
    label: "Settings",
    icon: Settings,
    groupKey: "settings",
    isActive: (pathname: string) => pathname.startsWith("/admin/settings"),
    children: [
      { href: "/admin/settings/lightspeed", label: "Lightspeed" },
      { href: "/admin/settings/store-access", label: "Store Access" },
      { href: "/admin/settings/shipping", label: "Shipping" },
      { href: "/admin/settings/taxes", label: "Taxes" },
      { href: "/admin/settings/transfers", label: "Bank" },
    ],
  },
];

export function AdminSidebar({
  userEmail: _userEmail,
  role,
}: {
  userEmail?: string | null;
  role: ProfileRole;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const chatLastSenderRef = useRef(new Map<string, "customer" | "admin" | "none">());
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

  const [notifBadgeCount, setNotifBadgeCount] = useState<number | null>(null);

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

  const refreshNotifCount = async () => {
    try {
      const res = await fetch("/api/admin/notifications/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (typeof data.unreadCount === "number") {
        setNotifBadgeCount(data.unreadCount);
      }
    } catch {
      // keep last value; do not force 0
    }
  };

  useEffect(() => {
    refreshNotifCount();

    const onUpdated = (e: Event) => {
      const evt = e as CustomEvent;
      const next = evt.detail?.unreadCount;
      if (typeof next === "number") {
        setNotifBadgeCount(next);
      }
    };

    window.addEventListener("adminNotificationsUpdated", onUpdated);
    return () => window.removeEventListener("adminNotificationsUpdated", onUpdated);
  }, []);

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

  useEffect(() => {
    let isActive = true;

    const loadChatBadge = async () => {
      try {
        const response = await fetch("/api/chats?status=open", { cache: "no-store" });
        const data = await response.json();
        const chats = (data.chats ?? []) as ChatSummary[];
        const nextMap = new Map<string, "customer" | "admin" | "none">();

        chats.forEach((chat) => {
          const lastMessage = chat.messages?.[0];
          if (!lastMessage) {
            nextMap.set(chat.id, "none");
            return;
          }
          nextMap.set(chat.id, lastMessage.sender_role ?? "none");
        });

        chatLastSenderRef.current = nextMap;

        const count = Array.from(nextMap.values()).filter(
          (senderRole) => senderRole !== "admin",
        ).length;
        if (isActive) {
          setChatBadgeCount(count);
        }
      } catch {
        if (isActive) {
          setChatBadgeCount(0);
        }
      }
    };

    loadChatBadge();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-sidebar-chats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        (payload) => {
          const chat = payload.new as { id: string; status?: string | null };
          if (chat.status && chat.status !== "open") {
            return;
          }
          chatLastSenderRef.current.set(chat.id, "none");

          if (isActive) {
            const count = Array.from(chatLastSenderRef.current.values()).filter(
              (senderRole) => senderRole !== "admin",
            ).length;
            setChatBadgeCount(count);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats" },
        (payload) => {
          const chat = payload.new as { id: string; status?: string | null };
          if (chat.status && chat.status !== "open") {
            chatLastSenderRef.current.delete(chat.id);
          } else if (!chatLastSenderRef.current.has(chat.id)) {
            chatLastSenderRef.current.set(chat.id, "none");
          }

          if (isActive) {
            const count = Array.from(chatLastSenderRef.current.values()).filter(
              (senderRole) => senderRole !== "admin",
            ).length;
            setChatBadgeCount(count);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const message = payload.new as {
            chat_id: string;
            sender_role?: "customer" | "admin";
          };
          if (!chatLastSenderRef.current.has(message.chat_id)) {
            return;
          }

          chatLastSenderRef.current.set(message.chat_id, message.sender_role ?? "none");

          if (isActive) {
            const count = Array.from(chatLastSenderRef.current.values()).filter(
              (senderRole) => senderRole !== "admin",
            ).length;
            setChatBadgeCount(count);
          }
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  function SidebarContent() {
    const canViewBankTab = canViewBank(role);
    const baseItemClass =
      "group flex items-center gap-3 border border-transparent px-4 py-3 " +
      "bg-transparent transition-colors hover:bg-brand-page";

    const activeItemClass = "border-brand-text bg-brand-text text-brand-surface";
    const inactiveItemClass = "text-brand-text";

    const inAdmin = pathname.startsWith("/admin");

    const statusBase =
      "flex w-full items-center gap-2 px-3 py-2 rounded-sm select-none " +
      "text-[12px] sm:text-[13px] leading-none bg-brand-text text-brand-surface";

    const notifLabel =
      typeof notifBadgeCount === "number" && notifBadgeCount > 9
        ? "9+"
        : String(notifBadgeCount ?? 0);

    // Match notifications style: red text only, no box.
    const chatLabel = chatBadgeCount > 9 ? "9+" : String(chatBadgeCount);

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
                if (item.href === "/admin/bank" && !canViewBankTab) {
                  return null;
                }
                const icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <div
                    key={item.href}
                    data-testid={
                      item.href === "/admin/bank" ? "admin-nav-bank" : undefined
                    }
                  >
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

              const filteredChildren = item.children.filter(
                (child) => child.href !== "/admin/settings/transfers" || canViewBankTab,
              );
              if (filteredChildren.length === 0) {
                return null;
              }

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
                      className="ml-4 border-l border-zinc-800/70 pl-3 space-y-1"
                    >
                      {filteredChildren.map((child) => {
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
            <div className="grid w-full grid-cols-3 items-center">
              {/* Profile */}
              <Tooltip label="Profile" side="top">
                <Link
                  href="/admin/profile"
                  onClick={() => setIsOpen(false)}
                  aria-label="Profile"
                  className="flex h-12 w-full items-center justify-center rounded-sm
                            hover:bg-zinc-900 transition-colors
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
                >
                  <User className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                </Link>
              </Tooltip>

              {/* Messages */}
              <Tooltip label="Messages" side="top">
                <Link
                  href="/admin/chats"
                  onClick={() => setIsOpen(false)}
                  aria-label="Messages"
                  className="flex h-12 w-full items-center justify-center rounded-sm
                            hover:bg-zinc-900 transition-colors
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
                >
                  <span className="relative">
                    <MessageCircle className="w-5 h-5 text-brand-muted group-hover:text-brand-text transition-colors" />
                    {chatBadgeCount > 0 && (
                      <span className="absolute -top-2 -right-2 text-[10px] font-semibold text-red-500">
                        {chatLabel}
                      </span>
                    )}
                  </span>
                </Link>
              </Tooltip>

              {/* Notifications */}
              <Tooltip label="Notifications" side="top">
                <button
                  type="button"
                  onClick={() => setNotifOpen(true)}
                  aria-label="Notifications"
                  data-testid="admin-notifications-toggle"
                  className="flex h-12 w-full items-center justify-center rounded-sm
                            hover:bg-zinc-900 transition-colors
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
                >
                  <span className="relative">
                    <Bell className="w-5 h-5 text-brand-muted group-hover:text-brand-text transition-colors" />
                    {typeof notifBadgeCount === "number" && notifBadgeCount > 0 && (
                      <span className="absolute -top-2 -right-2 text-[10px] font-semibold text-red-500">
                        {notifLabel}
                      </span>
                    )}
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>

          <AdminNotificationsDrawer
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
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
