"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { CheckoutLockCard } from "@/components/admin/settings/StoreAccessCards";
import { useStoreAccessSettingsPanel } from "@/components/admin/settings/useStoreAccessSettingsPanel";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

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
