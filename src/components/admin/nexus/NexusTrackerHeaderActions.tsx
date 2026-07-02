"use client";

import { Download, Home } from "lucide-react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type NexusTrackerHeaderActionsProps = {
  homeState: string;
  isHomeOfficeConfigured: boolean;
  isTaxEnabled: boolean;
  onDownloadTaxDocs: () => void;
  onOpenHomeOffice: () => void;
};

export function NexusTrackerHeaderActions({
  homeState,
  isHomeOfficeConfigured,
  isTaxEnabled,
  onDownloadTaxDocs,
  onOpenHomeOffice,
}: NexusTrackerHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onDownloadTaxDocs}
        disabled={!isTaxEnabled}
        className={[
          adminButtonStyles.secondary,
          "gap-2",
          !isTaxEnabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <Download className="h-4 w-4" />
        View Tax Reports
      </button>

      <button
        onClick={onOpenHomeOffice}
        className={[
          isHomeOfficeConfigured
            ? adminButtonStyles.secondary
            : adminButtonStyles.primary,
          "gap-2",
        ].join(" ")}
      >
        <Home className="h-4 w-4" />
        {isHomeOfficeConfigured ? "Change Home Office" : "Setup Home Office"}
      </button>

      <div className="flex h-10 items-center gap-2 border border-brand-border bg-brand-page px-3 text-brand-text">
        <span className="text-[10px] uppercase tracking-wide text-brand-muted">Home</span>
        <span className="text-sm font-bold">{homeState}</span>
      </div>
    </div>
  );
}
