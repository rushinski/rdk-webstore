"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { TaxCodeCategoryCard } from "@/modules/settings/presentation/admin/tax/TaxCodeCategoryCard";
import { useTaxSettingsPanel } from "@/modules/settings/presentation/admin/tax/useTaxSettingsPanel";

export function TaxSettingsPanel() {
  const {
    effectiveCodes,
    handleCodeChange,
    handleSave,
    isLoading,
    isSaving,
    message,
    resetToDefault,
    setTaxEnabled,
    taxEnabled,
  } = useTaxSettingsPanel();

  if (isLoading) {
    return (
      <AdminSectionCard>
        <div className="text-sm text-brand-muted">Loading tax settings...</div>
      </AdminSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard title="Tax Collection">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-brand-muted">
              Toggle tax calculations and assign category tax codes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminStatusBadge tone={taxEnabled ? "success" : "neutral"}>
              {taxEnabled ? "Enabled" : "Disabled"}
            </AdminStatusBadge>
            <ToggleSwitch
              checked={taxEnabled}
              onChange={setTaxEnabled}
              ariaLabel="Toggle tax collection"
              disabled={isSaving}
            />
          </div>
        </div>
      </AdminSectionCard>

      {!taxEnabled ? (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Taxes are turned off. Enable taxes to collect and track nexus activity.
        </div>
      ) : null}

      <AdminSectionCard title="Category Tax Codes">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-brand-muted">
              These codes determine the correct tax rules per category.
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              Tax codes like `txcd_30011000` map to product taxability.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {effectiveCodes.map((category) => (
              <TaxCodeCategoryCard
                key={category.key}
                category={category}
                disabled={!taxEnabled}
                isSaving={isSaving}
                onCodeChange={handleCodeChange}
                onResetToDefault={resetToDefault}
              />
            ))}
          </div>
        </div>
      </AdminSectionCard>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isSaving}
          className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
        >
          {isSaving ? "Saving..." : "Save tax settings"}
        </button>
        {message ? <span className="text-sm text-brand-muted">{message}</span> : null}
      </div>
    </div>
  );
}
