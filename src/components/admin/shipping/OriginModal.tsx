"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { ModalPortal } from "@/components/ui/ModalPortal";

import type { ShippingOrigin } from "../../../types/domain/shipping";

import { OriginAddressFields } from "./OriginAddressFields";

type OriginErrors = Partial<Record<keyof ShippingOrigin, string>>;

type OriginModalProps = {
  open: boolean;
  originAddress: ShippingOrigin | null;
  emptyOrigin: ShippingOrigin;
  originError: string;
  originMessage: string;
  originFieldErrors?: OriginErrors;
  savingOrigin: boolean;
  onClose: () => void;
  onChange: (field: keyof ShippingOrigin, value: string) => void;
  onSave: () => void;
};

export function OriginModal({
  open,
  originAddress,
  emptyOrigin,
  originError,
  originMessage,
  originFieldErrors,
  savingOrigin,
  onClose,
  onChange,
  onSave,
}: OriginModalProps) {
  const value = originAddress ?? emptyOrigin;
  const errors = originFieldErrors ?? {};

  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="w-full max-w-3xl border border-brand-border bg-brand-surface p-3 sm:p-6">
        <div className="mb-2 flex items-center justify-between gap-3 sm:mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
              Change origin address
            </h2>
            <p className="hidden text-[12px] text-brand-muted sm:block sm:text-sm">
              Update the address used to create shipping labels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-brand-muted transition-colors hover:text-brand-text sm:text-sm"
          >
            Close
          </button>
        </div>

        <OriginAddressFields errors={errors} onChange={onChange} value={value} />

        {(originError || originMessage) && (
          <div
            className={`mt-4 text-sm ${originError ? "text-red-700" : "text-emerald-700"}`}
          >
            {originError || originMessage}
          </div>
        )}

        <div className="mt-3 flex items-center justify-end gap-2 sm:mt-6 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`${adminButtonStyles.secondary} px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-sm`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={savingOrigin}
            className={`${adminButtonStyles.primary} px-3 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted sm:px-4 sm:py-2 sm:text-sm`}
          >
            {savingOrigin ? "Saving..." : "Save origin"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
