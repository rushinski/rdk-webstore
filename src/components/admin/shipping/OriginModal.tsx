"use client";

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
      <div className="w-full max-w-3xl rounded-sm border border-zinc-800/70 bg-zinc-950 p-3 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-4">
          <div>
            <h2 className="text-sm sm:text-lg font-semibold text-white">
              Change origin address
            </h2>
            <p className="hidden sm:block text-[12px] sm:text-sm text-zinc-400">
              Update the address used to create shipping labels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-[11px] sm:text-sm"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4 text-[11px] sm:text-sm">
          <div className="col-span-2 text-[10px] sm:text-xs text-zinc-400">
            Provide a contact name or company name. Phone number is optional.
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Contact name</label>
            <input
              type="text"
              value={value.name ?? ""}
              onChange={(e) => onChange("name", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.name ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.name && (
              <div className="text-[10px] text-red-400 mt-1">{errors.name}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Company</label>
            <input
              type="text"
              value={value.company ?? ""}
              onChange={(e) => onChange("company", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.company ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.company && (
              <div className="text-[10px] text-red-400 mt-1">{errors.company}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Phone (optional)</label>
            <input
              type="text"
              value={value.phone ?? ""}
              onChange={(e) => onChange("phone", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.phone ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.phone && (
              <div className="text-[10px] text-red-400 mt-1">{errors.phone}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Line 1</label>
            <input
              type="text"
              value={value.line1}
              onChange={(e) => onChange("line1", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.line1 ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.line1 && (
              <div className="text-[10px] text-red-400 mt-1">{errors.line1}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Line 2</label>
            <input
              type="text"
              value={value.line2 ?? ""}
              onChange={(e) => onChange("line2", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.line2 ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.line2 && (
              <div className="text-[10px] text-red-400 mt-1">{errors.line2}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">City</label>
            <input
              type="text"
              value={value.city}
              onChange={(e) => onChange("city", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.city ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.city && (
              <div className="text-[10px] text-red-400 mt-1">{errors.city}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">State</label>
            <input
              type="text"
              value={value.state}
              onChange={(e) => onChange("state", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.state ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.state && (
              <div className="text-[10px] text-red-400 mt-1">{errors.state}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Postal Code</label>
            <input
              type="text"
              value={value.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.postal_code ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.postal_code && (
              <div className="text-[10px] text-red-400 mt-1">{errors.postal_code}</div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Country</label>
            <input
              type="text"
              value={value.country}
              onChange={(e) => onChange("country", e.target.value)}
              className={`w-full bg-zinc-900 text-white px-2 py-1.5 border ${
                errors.country ? "border-red-500" : "border-zinc-800/70"
              }`}
            />
            {errors.country && (
              <div className="text-[10px] text-red-400 mt-1">{errors.country}</div>
            )}
          </div>
        </div>

        {(originError || originMessage) && (
          <div
            className={`mt-4 text-sm ${originError ? "text-red-400" : "text-green-400"}`}
          >
            {originError || originMessage}
          </div>
        )}

        <div className="mt-3 sm:mt-6 flex items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-zinc-800/70 text-[11px] sm:text-sm text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={savingOrigin}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white text-[11px] sm:text-sm hover:bg-red-500 disabled:bg-zinc-700"
          >
            {savingOrigin ? "Saving..." : "Save origin"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
