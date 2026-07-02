// src/components/admin/settings/shipping/AdminShippingSettingsScreen.tsx
"use client";

import { centsToMoneyString } from "@/components/admin/settings/shipping/shippingSettingsConfig";
import { ShippingCarriersSettingsCard } from "@/components/admin/settings/shipping/ShippingCarriersSettingsCard";
import { ShippingDefaultsModal } from "@/components/admin/settings/shipping/ShippingDefaultsModal";
import { ShippingOriginModal } from "@/components/admin/settings/shipping/ShippingOriginModal";
import { ShippingOriginSettingsCard } from "@/components/admin/settings/shipping/ShippingOriginSettingsCard";
import { ShippingPackageDefaultsCard } from "@/components/admin/settings/shipping/ShippingPackageDefaultsCard";
import { ShippingSettingsModalShell } from "@/components/admin/settings/shipping/ShippingSettingsShared";
import { useAdminShippingSettingsData } from "@/components/admin/settings/shipping/useAdminShippingSettingsData";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export { ShippingSettingsModalShell };

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ShippingOriginSettingsCard originLine={originLine} onEdit={openOriginModal} />

        <ShippingCarriersSettingsCard
          carriersMessage={carriersMessage}
          enabledCarriers={enabledCarriers}
          isSavingCarriers={isSavingCarriers}
          onToggleCarrier={toggleCarrier}
          onSaveCarriers={() => {
            void saveCarriers();
          }}
        />

        <ShippingPackageDefaultsCard
          message={message}
          shippingDefaults={shippingDefaults}
          onOpenDefaultsModal={openDefaultsModal}
        />
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
          setShippingCostInput(centsToMoneyString(defaultsDraft?.shipping_cost_cents ?? 0))
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
