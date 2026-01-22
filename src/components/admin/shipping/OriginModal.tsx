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
  if (!open) return null;

  const value = originAddress ?? emptyOrigin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-sm border border-zinc-800/70 bg-zinc-950 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Change origin address</h2>
            <p className="text-sm text-zinc-400">
              Update the address used to create shipping labels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Company</label>
            <input
              type="text"
              value={value.company ?? ""}
              onChange={(e) => onChange("company", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Phone</label>
            <input
              type="text"
              value={value.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Line 1</label>
            <input
              type="text"
              value={value.line1}
              onChange={(e) => onChange("line1", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Line 2</label>
            <input
              type="text"
              value={value.line2 ?? ""}
              onChange={(e) => onChange("line2", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">City</label>
            <input
              type="text"
              value={value.city}
              onChange={(e) => onChange("city", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">State</label>
            <input
              type="text"
              value={value.state}
              onChange={(e) => onChange("state", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Postal Code</label>
            <input
              type="text"
              value={value.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Country</label>
            <input
              type="text"
              value={value.country}
              onChange={(e) => onChange("country", e.target.value)}
              className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
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

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-800/70 text-sm text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={savingOrigin}
            className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:bg-zinc-700"
          >
            {savingOrigin ? "Saving..." : "Save origin"}
          </button>
        </div>
      </div>
    </div>
  );
}
