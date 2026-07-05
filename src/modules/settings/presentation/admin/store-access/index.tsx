"use client";

import { StoreAccessSettingsPanel } from "@/components/admin/settings/StoreAccessSettingsPanel";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

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
