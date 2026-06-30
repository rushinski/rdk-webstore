"use client";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StoreAccessSettingsPanel } from "@/components/admin/settings/StoreAccessSettingsPanel";

export default function StoreAccessSettingsPage() {
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
