import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

import {
  ShippingSettingsField,
  ShippingSettingsModalShell,
} from "./ShippingSettingsShared";

type ShippingDefaultsModalProps = {
  activeCategoryLabel: string;
  defaultsDraftOpen: boolean;
  lengthInput: string;
  widthInput: string;
  heightInput: string;
  weightInput: string;
  shippingCostInput: string;
  isSavingDefaults: boolean;
  onClose: () => void;
  onDimensionInput: (
    field: "length" | "width" | "height" | "weight",
    value: string,
  ) => void;
  onShippingCostChange: (value: string) => void;
  onShippingCostBlur: () => void;
  onSave: () => void;
};

export function ShippingDefaultsModal({
  activeCategoryLabel,
  defaultsDraftOpen,
  lengthInput,
  widthInput,
  heightInput,
  weightInput,
  shippingCostInput,
  isSavingDefaults,
  onClose,
  onDimensionInput,
  onShippingCostChange,
  onShippingCostBlur,
  onSave,
}: ShippingDefaultsModalProps) {
  if (!defaultsDraftOpen) {
    return null;
  }

  return (
    <ShippingSettingsModalShell
      title="Edit Package Defaults"
      description={`${activeCategoryLabel} defaults`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-brand-muted">
            Package size
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ShippingSettingsField label="Length (in)">
              <input
                type="text"
                inputMode="numeric"
                value={lengthInput}
                onChange={(e) => onDimensionInput("length", e.target.value)}
                className={adminFormStyles.input}
              />
            </ShippingSettingsField>
            <ShippingSettingsField label="Width (in)">
              <input
                type="text"
                inputMode="numeric"
                value={widthInput}
                onChange={(e) => onDimensionInput("width", e.target.value)}
                className={adminFormStyles.input}
              />
            </ShippingSettingsField>
            <ShippingSettingsField label="Height (in)">
              <input
                type="text"
                inputMode="numeric"
                value={heightInput}
                onChange={(e) => onDimensionInput("height", e.target.value)}
                className={adminFormStyles.input}
              />
            </ShippingSettingsField>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ShippingSettingsField label="Weight (oz)">
            <input
              type="text"
              inputMode="numeric"
              value={weightInput}
              onChange={(e) => onDimensionInput("weight", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField label="Shipping cost ($)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={shippingCostInput}
              onChange={(e) => onShippingCostChange(e.target.value)}
              onBlur={onShippingCostBlur}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
          <button type="button" onClick={onClose} className={adminButtonStyles.secondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingDefaults}
            className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
          >
            {isSavingDefaults ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </ShippingSettingsModalShell>
  );
}
