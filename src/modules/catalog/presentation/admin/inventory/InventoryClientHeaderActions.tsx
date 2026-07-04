"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type InventoryClientHeaderActionsProps = {
  onExport: () => void;
};

export function InventoryClientHeaderActions({
  onExport,
}: InventoryClientHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onExport}
        aria-label="Export inventory"
        className={`${adminButtonStyles.secondary} gap-1 sm:gap-2`}
      >
        <Download className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">Export Inventory</span>
      </button>

      <Link
        href="/admin/inventory/create"
        aria-label="Create product"
        className={`${adminButtonStyles.primary} gap-1 sm:gap-2`}
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">Create Product</span>
      </Link>
    </div>
  );
}
