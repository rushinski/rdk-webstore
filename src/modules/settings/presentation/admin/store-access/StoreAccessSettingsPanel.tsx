"use client";

import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { CheckoutLockCard } from "@/modules/settings/presentation/admin/store-access/StoreAccessCards";
import { useStoreAccessSettingsPanel } from "@/modules/settings/presentation/admin/store-access/useStoreAccessSettingsPanel";

export function StoreAccessSettingsPanel() {
  const {
    checkoutLockEnabled,
    checkoutLockMessage,
    isLoading,
    isSaving,
    message,
    save,
    setCheckoutLockEnabled,
    setCheckoutLockMessage,
  } = useStoreAccessSettingsPanel();

  if (isLoading) {
    return (
      <AdminSectionCard>
        <div className="text-sm text-brand-muted">Loading store access settings...</div>
      </AdminSectionCard>
    );
  }

  return (
    <div className="grid gap-4">
      <CheckoutLockCard
        checkoutLockEnabled={checkoutLockEnabled}
        checkoutLockMessage={checkoutLockMessage}
        onCheckoutLockEnabledChange={setCheckoutLockEnabled}
        onCheckoutLockMessageChange={setCheckoutLockMessage}
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-brand-muted">{message}</span>
        <button
          type="button"
          onClick={() => {
            void save();
          }}
          disabled={isSaving}
          className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
        >
          {isSaving ? "Saving..." : "Save store access settings"}
        </button>
      </div>
    </div>
  );
}
