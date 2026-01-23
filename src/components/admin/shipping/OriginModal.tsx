"use client";

import { ModalPortal } from "@/components/ui/ModalPortal";

import type { ShippingOrigin } from "../../../types/domain/shipping";

type OriginModalProps = {
  open: boolean;
  originAddress: ShippingOrigin | null;
  emptyOrigin: ShippingOrigin;
  originError: string;
  originMessage: string;
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
  savingOrigin,
  onClose,
  onChange,
  onSave,
}: OriginModalProps) {
  const value = originAddress ?? emptyOrigin;

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
          <div>
            <label className="block text-gray-400 mb-0.5">Name</label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Company</label>
            <input
              type="text"
              value={value.company ?? ""}
              onChange={(e) => onChange("company", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Phone</label>
            <input
              type="text"
              value={value.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Line 1</label>
            <input
              type="text"
              value={value.line1}
              onChange={(e) => onChange("line1", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Line 2</label>
            <input
              type="text"
              value={value.line2 ?? ""}
              onChange={(e) => onChange("line2", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">City</label>
            <input
              type="text"
              value={value.city}
              onChange={(e) => onChange("city", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">State</label>
            <input
              type="text"
              value={value.state}
              onChange={(e) => onChange("state", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Postal Code</label>
            <input
              type="text"
              value={value.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-0.5">Country</label>
            <input
              type="text"
              value={value.country}
              onChange={(e) => onChange("country", e.target.value)}
              className="w-full bg-zinc-900 text-white px-2 py-1.5 border border-zinc-800/70"
            />
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
