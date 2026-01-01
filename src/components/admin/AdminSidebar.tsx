// src/components/admin/AdminSidebar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { AdminNotificationCenter } from "@/components/admin/AdminNotificationCenter";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
];

export function AdminSidebar({ userEmail }: { userEmail?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatBadgeCount, setChatBadgeCount] = useState(0);

  const chatLastSenderRef = useRef(new Map<string, "customer" | "admin" | "none">());
  const pathname = usePathname();
  const userInitial = userEmail?.trim().charAt(0).toUpperCase() || "A";

  const analyticsActive = pathname.startsWith("/admin/analytics");
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false);

  // Auto-open group when you’re inside it (keeps IA crisp)
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

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          <Link
            href="/admin/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 border border-zinc-800/70 bg-zinc-950 hover:bg-zinc-900 transition rounded-sm"
          >
            <div className="w-9 h-9 rounded-sm bg-red-600 text-white flex items-center justify-center font-semibold">
              {userInitial}
            </div>
            <div className="text-sm text-zinc-300">Personal settings</div>
          </Link>

          <nav className="space-y-1">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`${baseItemClass} ${inactiveItemClass}`}
            >
              <Globe className="w-5 h-5" />
              <span>Website</span>
            </Link>

            {navItems.map((item) => {
              if (item.type === "link") {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`${baseItemClass} ${
                      isActive ? activeItemClass : inactiveItemClass
                    }`}
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

        <div className="sticky bottom-0 pt-3 border-t border-zinc-800/70 bg-zinc-900">
          <div className="flex items-center justify-between px-4 py-2">
            <Link
              href="/admin/chats"
              onClick={() => setIsOpen(false)}
              className="relative flex items-center justify-center w-10 h-10 border border-zinc-800/70 bg-zinc-950 hover:bg-zinc-800 transition-colors rounded-sm"
              aria-label="Chats"
            >
              <MessageCircle className="w-5 h-5 text-zinc-200" />
              {chatBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm">
                  {chatBadgeCount}
                </span>
              )}
            </Link>

            <AdminNotificationCenter />

            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-center w-10 h-10 border border-zinc-800/70 bg-zinc-950 hover:bg-zinc-800 transition-colors rounded-sm ${
                pathname.startsWith("/admin/settings") ? "text-white" : "text-zinc-200"
              }`}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-5 right-5 z-40 bg-red-600 text-white p-3 rounded-sm shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Admin Menu</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
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
