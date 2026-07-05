"use client";

import { createElement } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Globe, LayoutDashboard } from "lucide-react";

import { AdminNavItem } from "@/components/admin/shell/AdminNavItem";
import { AdminSidebarProfileDock } from "@/components/admin/shell/AdminSidebarProfileDock";
import type { AdminSidebarGroupKey } from "@/components/admin/shell/adminSidebarNavigation";
import { adminSidebarItems } from "@/components/admin/shell/adminSidebarNavigation";

type AdminSidebarContentProps = {
  openGroups: Record<AdminSidebarGroupKey, boolean>;
  pathname: string;
  onClose: () => void;
  onToggleGroup: (groupKey: AdminSidebarGroupKey) => void;
};

export function AdminSidebarContent({
  openGroups,
  pathname,
  onClose,
  onToggleGroup,
}: AdminSidebarContentProps) {
  const baseItemClass =
    "group flex items-center gap-3 border border-transparent px-4 py-3 bg-transparent transition-colors hover:bg-brand-page";
  const activeItemClass = "border-brand-text bg-brand-text text-brand-surface";
  const inactiveItemClass = "text-brand-text";
  const inAdmin = pathname.startsWith("/admin");
  const statusBase =
    "flex w-full items-center gap-2 rounded-sm bg-brand-text px-3 py-2 text-[12px] leading-none text-brand-surface select-none sm:text-[13px]";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="admin-sidebar-scroll flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
        <div className="mb-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-brand-muted">
            Workspace
          </div>

          <div className={statusBase} aria-current="page">
            {inAdmin ? (
              <>
                <LayoutDashboard className="h-4 w-4" />
                <span className="font-medium">Admin</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span className="font-medium">Website</span>
              </>
            )}
          </div>

          <div className="mt-4 border-t border-brand-border" />
        </div>

        <nav className="space-y-1">
          {adminSidebarItems.map((item) => {
            if (item.type === "link") {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <div key={item.href}>
                  <AdminNavItem
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                    onClick={onClose}
                  />
                </div>
              );
            }

            const isGroupActive = item.isActive(pathname);
            const isGroupOpen = openGroups[item.groupKey];
            const chevron = isGroupOpen ? ChevronDown : ChevronRight;

            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => onToggleGroup(item.groupKey)}
                  className={`${baseItemClass} w-full justify-between ${
                    isGroupActive ? activeItemClass : inactiveItemClass
                  }`}
                  aria-expanded={isGroupOpen}
                  aria-controls={`admin-${item.groupKey}-subnav`}
                >
                  <span className="flex items-center gap-3">
                    {createElement(item.icon, { className: "h-5 w-5" })}
                    <span className="text-[13px] sm:text-[15px]">{item.label}</span>
                  </span>
                  {createElement(chevron, { className: "h-4 w-4 opacity-80" })}
                </button>

                {isGroupOpen ? (
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
                          onClick={onClose}
                          className={`flex items-center rounded-sm border border-transparent px-3 py-2 transition-colors ${
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
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      <AdminSidebarProfileDock onNavigate={onClose} />
    </div>
  );
}
