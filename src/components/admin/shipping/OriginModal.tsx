"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { ModalPortal } from "@/components/ui/ModalPortal";

import type { ShippingOrigin } from "../../../types/domain/shipping";

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

        <div className="grid grid-cols-2 gap-2 text-[11px] sm:gap-4 sm:text-sm md:grid-cols-2">
          <div className="col-span-2 text-[10px] text-brand-muted sm:text-xs">
            Provide a contact name or company name. Phone number is optional.
          </div>
          <div>
            <label className={adminFormStyles.label}>Contact name</label>
            <input
              type="text"
              value={value.name ?? ""}
              onChange={(e) => onChange("name", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.name ? "border-red-500" : ""
              }`}
            />
            {errors.name && (
              <div className="text-[10px] text-red-400 mt-1">{errors.name}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>Company</label>
            <input
              type="text"
              value={value.company ?? ""}
              onChange={(e) => onChange("company", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.company ? "border-red-500" : ""
              }`}
            />
            {errors.company && (
              <div className="text-[10px] text-red-400 mt-1">{errors.company}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>Phone (optional)</label>
            <input
              type="text"
              value={value.phone ?? ""}
              onChange={(e) => onChange("phone", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.phone ? "border-red-500" : ""
              }`}
            />
            {errors.phone && (
              <div className="text-[10px] text-red-400 mt-1">{errors.phone}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>Line 1</label>
            <input
              type="text"
              value={value.line1}
              onChange={(e) => onChange("line1", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.line1 ? "border-red-500" : ""
              }`}
            />
            {errors.line1 && (
              <div className="text-[10px] text-red-400 mt-1">{errors.line1}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>Line 2</label>
            <input
              type="text"
              value={value.line2 ?? ""}
              onChange={(e) => onChange("line2", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.line2 ? "border-red-500" : ""
              }`}
            />
            {errors.line2 && (
              <div className="text-[10px] text-red-400 mt-1">{errors.line2}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>City</label>
            <input
              type="text"
              value={value.city}
              onChange={(e) => onChange("city", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.city ? "border-red-500" : ""
              }`}
            />
            {errors.city && (
              <div className="text-[10px] text-red-400 mt-1">{errors.city}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>State</label>
            <input
              type="text"
              value={value.state}
              onChange={(e) => onChange("state", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.state ? "border-red-500" : ""
              }`}
            />
            {errors.state && (
              <div className="text-[10px] text-red-400 mt-1">{errors.state}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>Postal Code</label>
            <input
              type="text"
              value={value.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.postal_code ? "border-red-500" : ""
              }`}
            />
            {errors.postal_code && (
              <div className="text-[10px] text-red-400 mt-1">{errors.postal_code}</div>
            )}
          </div>
          <div>
            <label className={adminFormStyles.label}>Country</label>
            <input
              type="text"
              value={value.country}
              onChange={(e) => onChange("country", e.target.value)}
              className={`${adminFormStyles.input} px-2 py-1.5 ${
                errors.country ? "border-red-500" : ""
              }`}
            />
            {errors.country && (
              <div className="text-[10px] text-red-400 mt-1">{errors.country}</div>
            )}
          </div>
        </div>

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
