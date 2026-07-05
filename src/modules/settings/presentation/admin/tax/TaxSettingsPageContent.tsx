"use client";

import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";

import { TaxSettingsPanel } from "./TaxSettingsPanel";

export function TaxSettingsPageContent() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Tax Settings"
        description="Configure tax collection and category tax codes."
      />
      <TaxSettingsPanel />
    </div>
  );
}

