"use client";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StoreAccessSettingsPanel } from "@/modules/settings/presentation/admin/store-access/StoreAccessSettingsPanel";

export function StoreAccessSettingsPageContent() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Store Access"
        description="Control the storefront lock screen and checkout availability."
      />

      <StoreAccessSettingsPanel />
    </div>
  );
}
