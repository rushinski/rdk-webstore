"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";

const statusPanelClass = "flex items-start gap-2 rounded border p-3 text-sm";

type CreateLabelRateRequestPanelProps = {
  error: string | null;
  getRates: () => Promise<void>;
  hasAddressErrors: boolean;
  isGettingRates: boolean;
  success: string | null;
};

export function CreateLabelRateRequestPanel({
  error,
  getRates,
  hasAddressErrors,
  isGettingRates,
  success,
}: CreateLabelRateRequestPanelProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          void getRates();
        }}
        disabled={isGettingRates || hasAddressErrors}
        className={`${adminButtonStyles.primary} w-full md:w-auto disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
      >
        {isGettingRates ? "Getting rates..." : "Get shipping rates"}
      </button>

      {error ? (
        <div className={`${statusPanelClass} border-red-200 bg-red-50 text-red-700`}>
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      ) : null}
      {success ? (
        <div
          className={`${statusPanelClass} border-emerald-200 bg-emerald-50 text-emerald-700`}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{success}</div>
        </div>
      ) : null}
    </div>
  );
}

