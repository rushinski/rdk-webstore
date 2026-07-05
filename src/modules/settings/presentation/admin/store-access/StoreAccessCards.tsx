"use client";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

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
