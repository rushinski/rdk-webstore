// src/components/admin/settings/shipping/AdminShippingSettingsScreen.tsx
"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import {
  AVAILABLE_CARRIERS,
  centsToMoneyString,
  SHIPPING_CATEGORIES,
} from "@/components/admin/settings/shipping/shippingSettingsConfig";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { ShippingDefaultsModal } from "@/components/admin/settings/shipping/ShippingDefaultsModal";
import { ShippingOriginModal } from "@/components/admin/settings/shipping/ShippingOriginModal";
import { buildShippingPackageSummary } from "@/components/admin/settings/shipping/shippingSettingsView";
import { useAdminShippingSettingsData } from "@/components/admin/settings/shipping/useAdminShippingSettingsData";
export { ShippingSettingsModalShell } from "@/components/admin/settings/shipping/ShippingSettingsShared";

const cardStyles = "space-y-3 border border-brand-border bg-brand-surface p-5";
const mutedTextStyles = "text-sm text-brand-muted";
export function AdminShippingSettingsScreen() {
  const {
    activeCategoryLabel,
    carriersMessage,
    closeDefaultsModal,
    defaultsDraft,
    enabledCarriers,
    handleDimensionInput,
    handleOriginDraftChange,
    handleShippingCostChange,
    heightInput,
    isDefaultsModalOpen,
    isOriginModalOpen,
    isSavingCarriers,
    isSavingDefaults,
    isSavingOrigin,
    lengthInput,
    message,
    openDefaultsModal,
    openOriginModal,
    originDraft,
    originError,
    originErrors,
    originLine,
    originMessage,
    saveCarriers,
    saveDefaults,
    saveOrigin,
    setIsOriginModalOpen,
    setShippingCostInput,
    shippingCostInput,
    shippingDefaults,
    toggleCarrier,
    weightInput,
    widthInput,
  } = useAdminShippingSettingsData();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Shipping Settings"
        description="Shipping defaults, origin address, and carrier options"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminSectionCard>
          <div className={cardStyles}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-brand-text">
                  Origin address
                </h2>
                <p className="text-sm text-brand-muted">
                  Used for labels and rate estimates.
                </p>
              </div>
              <button
                type="button"
                onClick={openOriginModal}
                className={adminButtonStyles.secondary}
              >
                Edit origin
              </button>
            </div>
            <div className={mutedTextStyles}>
              {originLine ? originLine : "No origin address saved yet."}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard>
          <div className={cardStyles}>
            <div>
              <h2 className="mb-2 text-base font-semibold text-brand-text">
                Enabled Carriers
              </h2>
              <p className="mb-4 text-sm text-brand-muted">
                Select which carriers to offer for label creation.
              </p>
            </div>
            <div className="space-y-2">
              {AVAILABLE_CARRIERS.map((carrier) => (
                <label
                  key={carrier.key}
                  className="flex cursor-pointer items-start gap-3 border border-brand-border bg-brand-page p-3 hover:border-brand-text"
                >
                  <input
                    type="checkbox"
                    checked={enabledCarriers.includes(carrier.key)}
                    onChange={() => toggleCarrier(carrier.key)}
                    className="mt-1 rdk-checkbox"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-brand-text">
                      {carrier.label}
                    </div>
                    <div className="text-xs text-brand-muted">{carrier.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  void saveCarriers();
                }}
                disabled={isSavingCarriers}
                className={`${adminButtonStyles.primary} w-full disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
              >
                {isSavingCarriers ? "Saving..." : "Save carriers"}
              </button>
              {carriersMessage && (
                <div className="mt-2 text-sm text-brand-muted">{carriersMessage}</div>
              )}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard>
          <div className={cardStyles}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-brand-text">
                  Default packages
                </h2>
                <p className="text-sm text-brand-muted">
                  Configure default cost, weight, and dimensions per category.
                </p>
              </div>
              {message && <span className="text-sm text-brand-muted">{message}</span>}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {SHIPPING_CATEGORIES.map((category) => {
                const summary = buildShippingPackageSummary(
                  shippingDefaults,
                  category.key,
                );
                return (
                  <div
                    key={category.key}
                    className="border border-brand-border bg-brand-page p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-brand-muted">
                          {category.label}
                        </div>
                        <div className="mt-1 text-base font-semibold text-brand-text">
                          ${summary.cost} shipping
                        </div>
                        <div className="mt-2 text-xs text-brand-muted">
                          {summary.length} x {summary.width} x {summary.height} in ·{" "}
                          {summary.weight} oz
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDefaultsModal(category.key)}
                        className={adminButtonStyles.secondary}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <ShippingDefaultsModal
        activeCategoryLabel={activeCategoryLabel}
        defaultsDraftOpen={Boolean(isDefaultsModalOpen && defaultsDraft)}
        lengthInput={lengthInput}
        widthInput={widthInput}
        heightInput={heightInput}
        weightInput={weightInput}
        shippingCostInput={shippingCostInput}
        isSavingDefaults={isSavingDefaults}
        onClose={closeDefaultsModal}
        onDimensionInput={handleDimensionInput}
        onShippingCostChange={handleShippingCostChange}
        onShippingCostBlur={() =>
          setShippingCostInput(
            centsToMoneyString(defaultsDraft?.shipping_cost_cents ?? 0),
          )
        }
        onSave={() => {
          void saveDefaults();
        }}
      />

      <ShippingOriginModal
        open={isOriginModalOpen}
        originDraft={originDraft}
        originErrors={originErrors}
        originError={originError}
        originMessage={originMessage}
        isSavingOrigin={isSavingOrigin}
        onClose={() => setIsOriginModalOpen(false)}
        onChange={handleOriginDraftChange}
        onSave={() => {
          void saveOrigin();
        }}
      />
    </div>
  );
}
