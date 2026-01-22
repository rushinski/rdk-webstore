// app/admin/settings/taxes/page.tsx
"use client";

import { TaxSettingsPanel } from "@/components/admin/settings/TaxSettingsPanel";

export default function TaxSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tax Settings</h1>
        <p className="text-sm sm:text-base text-gray-400">
          Manage tax collection and Stripe tax codes for your catalog.
        </p>
      </div>

      <TaxSettingsPanel />
    </div>
  );
}
