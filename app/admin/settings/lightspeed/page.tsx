"use client";

import { LightspeedSettingsPanel } from "@/components/admin/settings/LightspeedSettingsPanel";

export default function LightspeedSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Lightspeed</h1>
        <p className="text-sm text-gray-400 sm:text-base">
          Manage Lightspeed Retail X-Series connectivity and sync readiness.
        </p>
      </div>

      <LightspeedSettingsPanel />
    </div>
  );
}
