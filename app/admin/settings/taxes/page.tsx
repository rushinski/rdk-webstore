// app/admin/settings/taxes/page.tsx
"use client";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { TaxSettingsPanel } from "@/components/admin/settings/TaxSettingsPanel";

export default function TaxSettingsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Tax Settings"
        description="Manage tax collection and tax codes for your catalog."
      />

      <TaxSettingsPanel />
    </div>
  );
}
