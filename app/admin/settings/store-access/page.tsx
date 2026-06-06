"use client";

import { StoreAccessSettingsPanel } from "@/components/admin/settings/StoreAccessSettingsPanel";

export default function StoreAccessSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Store Access</h1>
        <p className="text-sm text-gray-400 sm:text-base">
          Control the storefront lock screen and checkout availability.
        </p>
      </div>

      <StoreAccessSettingsPanel />
    </div>
  );
}
