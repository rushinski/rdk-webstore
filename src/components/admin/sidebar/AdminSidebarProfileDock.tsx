"use client";

import Link from "next/link";
import { User } from "lucide-react";

import { Tooltip } from "@/components/ui/Tooltip";

type AdminSidebarProfileDockProps = {
  onNavigate: () => void;
};

export function AdminSidebarProfileDock({ onNavigate }: AdminSidebarProfileDockProps) {
  return (
    <div className="sticky bottom-0 left-0 w-full flex-none self-stretch">
      <div className="-mx-6 w-[calc(100%+3rem)] border-t border-brand-border" />
      <div className="-mx-6 w-[calc(100%+3rem)] bg-brand-surface px-6 py-3">
        <div className="grid w-full grid-cols-1 items-center">
          <Tooltip label="Profile" side="top">
            <Link
              href="/admin/profile"
              onClick={onNavigate}
              aria-label="Profile"
              className="flex h-12 w-full items-center justify-center rounded-sm transition-colors hover:bg-brand-page focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/20"
            >
              <User className="h-5 w-5 text-brand-muted transition-colors group-hover:text-brand-text" />
            </Link>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
