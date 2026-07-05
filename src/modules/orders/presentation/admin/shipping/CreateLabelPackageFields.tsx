"use client";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import type { ParcelDraft } from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";

type CreateLabelPackageFieldsProps = {
  handleParcelInput: (field: keyof ParcelDraft, value: string) => void;
  heightInput: string;
  lengthInput: string;
  weightInput: string;
  widthInput: string;
};

export function CreateLabelPackageFields({
  handleParcelInput,
  heightInput,
  lengthInput,
  weightInput,
  widthInput,
}: CreateLabelPackageFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.12em] text-brand-muted">
        Package Dimensions
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className={adminFormStyles.label}>Weight (oz)</label>
          <input
            type="text"
            inputMode="numeric"
            value={weightInput}
            onChange={(event) => handleParcelInput("weight", event.target.value)}
            className={adminFormStyles.input}
          />
        </div>
        <div>
          <label className={adminFormStyles.label}>Length (in)</label>
          <input
            type="text"
            inputMode="numeric"
            value={lengthInput}
            onChange={(event) => handleParcelInput("length", event.target.value)}
            className={adminFormStyles.input}
          />
        </div>
        <div>
          <label className={adminFormStyles.label}>Width (in)</label>
          <input
            type="text"
            inputMode="numeric"
            value={widthInput}
            onChange={(event) => handleParcelInput("width", event.target.value)}
            className={adminFormStyles.input}
          />
        </div>
        <div>
          <label className={adminFormStyles.label}>Height (in)</label>
          <input
            type="text"
            inputMode="numeric"
            value={heightInput}
            onChange={(event) => handleParcelInput("height", event.target.value)}
            className={adminFormStyles.input}
          />
        </div>
      </div>
    </div>
  );
}
