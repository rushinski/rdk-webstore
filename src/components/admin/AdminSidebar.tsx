// src/components/admin/AdminSidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { AdminBrandHeader } from "@/components/admin/shell/AdminBrandHeader";
import { AdminSidebarContent } from "@/components/admin/sidebar/AdminSidebarContent";
import {
  getAdminSidebarActiveGroups,
  type AdminSidebarGroupKey,
} from "@/components/admin/sidebar/adminSidebarNavigation";
import type { ProfileRole } from "@/config/constants/roles";

export function AdminSidebar({
  userEmail: _userEmail,
  role: _role,
}: {
  userEmail?: string | null;
  role: ProfileRole;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState({
    analytics: false,
    orders: false,
    settings: false,
  });
  const activeGroups = getAdminSidebarActiveGroups(pathname);

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
    setOpenGroups((prev) => ({
      analytics: prev.analytics || activeGroups.analytics,
      orders: prev.orders || activeGroups.orders,
      settings: prev.settings || activeGroups.settings,
    }));
  }, [activeGroups.analytics, activeGroups.orders, activeGroups.settings]);

  const handleToggleGroup = (groupKey: AdminSidebarGroupKey) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

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
              <AdminSidebarContent
                openGroups={openGroups}
                pathname={pathname}
                onClose={() => setIsOpen(false)}
                onToggleGroup={handleToggleGroup}
              />
            </div>
          </div>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-brand-border bg-brand-surface md:block">
        <AdminBrandHeader />
        <div className="p-6">
          <AdminSidebarContent
            openGroups={openGroups}
            pathname={pathname}
            onClose={() => setIsOpen(false)}
            onToggleGroup={handleToggleGroup}
          />
        </div>
      </aside>
    </>
  );
}
