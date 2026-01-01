// src/components/admin/AdminSidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Bell,
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  DollarSign,
  Settings,
  MessageCircle,
  Globe,
  X,
  Menu,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";
import { AdminNotificationsDrawer } from "@/components/admin/AdminNotificationsDrawer";

type NavLinkItem = {
  type: "link";
  href: string;
  label: string;
  icon: any;
};

type NavGroupItem = {
  type: "group";
  label: string;
  icon: any;
  baseHref: string;
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
    baseHref: "/admin/analytics",
    children: [
      { href: "/admin/analytics/traffic", label: "Traffic" },
      { href: "/admin/analytics/financials", label: "Financials" },
    ],
  },
  { type: "link", href: "/admin/sales", label: "Sales", icon: DollarSign },
  { type: "link", href: "/admin/shipping", label: "Shipping", icon: Truck },
  { type: "link", href: "/admin/catalog", label: "Catalog", icon: Package },
  { type: "link", href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ userEmail }: { userEmail?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const chatLastSenderRef = useRef(new Map<string, "customer" | "admin" | "none">());
  const pathname = usePathname();

  const analyticsActive = pathname.startsWith("/admin/analytics");
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false);

  // Auto-open group when you’re inside it
  useEffect(() => {
    if (analyticsActive) setAnalyticsOpen(true);
  }, [analyticsActive]);

  useEffect(() => {
    let isActive = true;

    const loadChatBadge = async () => {
      try {
        const response = await fetch("/api/chats?status=open", { cache: "no-store" });
        const data = await response.json();
        const chats = data.chats ?? [];
        const nextMap = new Map<string, "customer" | "admin" | "none">();

        chats.forEach((chat: any) => {
          const lastMessage = chat.messages?.[0];
          if (!lastMessage) {
            nextMap.set(chat.id, "none");
            return;
          }
          nextMap.set(chat.id, lastMessage.sender_role ?? "none");
        });

        chatLastSenderRef.current = nextMap;

        const count = Array.from(nextMap.values()).filter((role) => role !== "admin").length;
        if (isActive) setChatBadgeCount(count);
      } catch {
        if (isActive) setChatBadgeCount(0);
      }
    };

    loadChatBadge();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-sidebar-chats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chats" }, (payload) => {
        const chat = payload.new as { id: string; status?: string | null };
        if (chat.status && chat.status !== "open") return;
        chatLastSenderRef.current.set(chat.id, "none");

        if (isActive) {
          const count = Array.from(chatLastSenderRef.current.values()).filter(
            (role) => role !== "admin"
          ).length;
          setChatBadgeCount(count);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chats" }, (payload) => {
        const chat = payload.new as { id: string; status?: string | null };
        if (chat.status && chat.status !== "open") chatLastSenderRef.current.delete(chat.id);
        else if (!chatLastSenderRef.current.has(chat.id)) chatLastSenderRef.current.set(chat.id, "none");

        if (isActive) {
          const count = Array.from(chatLastSenderRef.current.values()).filter(
            (role) => role !== "admin"
          ).length;
          setChatBadgeCount(count);
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const message = payload.new as { chat_id: string; sender_role?: "customer" | "admin" };
          if (!chatLastSenderRef.current.has(message.chat_id)) return;

          chatLastSenderRef.current.set(message.chat_id, message.sender_role ?? "none");

          if (isActive) {
            const count = Array.from(chatLastSenderRef.current.values()).filter(
              (role) => role !== "admin"
            ).length;
            setChatBadgeCount(count);
          }
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const SidebarContent = () => {
    const baseItemClass =
      "group flex items-center gap-3 px-4 py-3 border border-transparent bg-transparent " +
      "hover:bg-zinc-950 hover:border-zinc-800/70 transition-colors rounded-sm";

    const activeItemClass = "bg-zinc-950 border-zinc-800/70 text-white";
    const inactiveItemClass = "text-gray-400";

    const inAdmin = pathname.startsWith("/admin");

    const statusBase =
      "flex w-full items-center gap-2 px-3 py-2 rounded-sm select-none " +
      "text-[13px] leading-none bg-zinc-950 text-white";

    return (
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {/* Workspace Indicator (visual only) */}
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
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
            
            <div className="mt-4 border-t border-zinc-800/70" />
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.type === "link") {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`${baseItemClass} ${isActive ? activeItemClass : inactiveItemClass}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[15px]">{item.label}</span>
                  </Link>
                );
              }

              // group
              const Icon = item.icon;
              const isGroupActive = pathname.startsWith(item.baseHref);
              const Chevron = analyticsOpen ? ChevronDown : ChevronRight;

              return (
                <div key={item.baseHref} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setAnalyticsOpen((v) => !v)}
                    className={`${baseItemClass} w-full justify-between ${
                      isGroupActive ? activeItemClass : inactiveItemClass
                    }`}
                    aria-expanded={analyticsOpen}
                    aria-controls="admin-analytics-subnav"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="text-[15px]">{item.label}</span>
                    </span>
                    <Chevron className="w-4 h-4 opacity-80" />
                  </button>

                  {analyticsOpen && (
                    <div
                      id="admin-analytics-subnav"
                      className="ml-4 border-l border-zinc-800/70 pl-3 space-y-1"
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
                                ? "bg-red-900/20 text-white border-red-900/30"
                                : "text-gray-400 hover:bg-zinc-950 hover:border-zinc-800/70 hover:text-white"
                            }`}
                          >
                            <span className="text-[14px]">{child.label}</span>
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
          <div className="-mx-6 w-[calc(100%+3rem)] border-t border-zinc-800/70" />

          {/* Dock background spans edge-to-edge (cancels parent p-6) */}
          <div className="-mx-6 w-[calc(100%+3rem)] bg-zinc-950 px-6 py-3">
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
                    <MessageCircle className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                    {chatBadgeCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm">
                        {chatBadgeCount}
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
                  className="flex h-12 w-full items-center justify-center rounded-sm
                            hover:bg-zinc-900 transition-colors
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
                >
                  <Bell className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                </button>
              </Tooltip>
            </div>
          </div>

          <AdminNotificationsDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-5 right-5 z-40 bg-red-600 text-white p-3 rounded-sm shadow-lg"
        aria-label="Open admin menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Admin Menu</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      <aside className="hidden md:block fixed left-0 top-0 w-64 h-screen bg-zinc-900 border-r border-zinc-800/70 p-6 z-40">
        <h2 className="text-2xl font-bold text-white mb-8">Admin</h2>
        <SidebarContent />
      </aside>
    </>
  );
}
