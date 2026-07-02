"use client";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type SiteLockCardProps = {
  siteLockEnabled: boolean;
  siteUnlockAt: string;
  onSiteLockEnabledChange: (checked: boolean) => void;
  onSiteUnlockAtChange: (value: string) => void;
};

export function SiteLockCard({
  siteLockEnabled,
  siteUnlockAt,
  onSiteLockEnabledChange,
  onSiteUnlockAtChange,
}: SiteLockCardProps) {
  return (
    <AdminSectionCard title="Site Lock">
      <div className="space-y-4">
        <p className="text-sm text-brand-muted">
          Lock the public storefront until a specific date and time.
        </p>

        <label className="flex items-center gap-3 text-sm text-brand-text">
          <input
            type="checkbox"
            checked={siteLockEnabled}
            onChange={(event) => onSiteLockEnabledChange(event.target.checked)}
            className="rdk-checkbox"
          />
          Enable site lock
        </label>

        <div>
          <label className={adminFormStyles.label}>Unlock At</label>
          <input
            type="datetime-local"
            value={siteUnlockAt}
            onChange={(event) => onSiteUnlockAtChange(event.target.value)}
            className={adminFormStyles.input}
          />
        </div>
      </div>
    </AdminSectionCard>
  );
}

type CheckoutLockCardProps = {
  checkoutLockEnabled: boolean;
  checkoutLockMessage: string;
  onCheckoutLockEnabledChange: (checked: boolean) => void;
  onCheckoutLockMessageChange: (value: string) => void;
};

export function CheckoutLockCard({
  checkoutLockEnabled,
  checkoutLockMessage,
  onCheckoutLockEnabledChange,
  onCheckoutLockMessageChange,
}: CheckoutLockCardProps) {
  return (
    <AdminSectionCard title="Checkout Lock">
      <div className="space-y-4">
        <p className="text-sm text-brand-muted">
          Keep the site open while showing a temporary payment-unavailable message.
        </p>

        <label className="flex items-center gap-3 text-sm text-brand-text">
          <input
            type="checkbox"
            checked={checkoutLockEnabled}
            onChange={(event) => onCheckoutLockEnabledChange(event.target.checked)}
            className="rdk-checkbox"
          />
          Enable checkout lock
        </label>

        <div>
          <label className={adminFormStyles.label}>Checkout Message</label>
          <textarea
            value={checkoutLockMessage}
            onChange={(event) => onCheckoutLockMessageChange(event.target.value)}
            rows={5}
            className={adminFormStyles.input}
          />
        </div>
      </div>
    </AdminSectionCard>
  );
}
