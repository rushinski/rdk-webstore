"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

import type { TaxCategoryCodeState } from "./useTaxSettingsPanel";

type TaxCodeCategoryCardProps = {
  category: TaxCategoryCodeState;
  disabled: boolean;
  isSaving: boolean;
  onCodeChange: (key: TaxCategoryCodeState["key"], value: string) => void;
  onResetToDefault: (key: TaxCategoryCodeState["key"]) => void;
};

export function TaxCodeCategoryCard({
  category,
  disabled,
  isSaving,
  onCodeChange,
  onResetToDefault,
}: TaxCodeCategoryCardProps) {
  return (
    <div className="space-y-3 border border-brand-border bg-brand-page p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-brand-text">{category.label}</div>
          <div className="text-xs text-brand-muted">Default: {category.defaultCode}</div>
        </div>
        <div className="text-xs text-brand-muted">
          Effective:{" "}
          <span className="font-semibold text-brand-text">{category.effectiveCode}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={category.override}
          onChange={(event) => onCodeChange(category.key, event.target.value)}
          disabled={disabled || isSaving}
          placeholder={category.defaultCode}
          className={adminFormStyles.input}
        />
        <button
          type="button"
          onClick={() => onResetToDefault(category.key)}
          disabled={disabled || isSaving || !category.override}
          className={`${adminButtonStyles.secondary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-surface disabled:text-brand-muted`}
        >
          Use default
        </button>
      </div>

      <div className="text-xs text-brand-muted">
        Leave blank to use the default tax code for this category.
      </div>
    </div>
  );
}
