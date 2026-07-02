import { DollarSign } from "lucide-react";

import type { StateSummary } from "@/types/domain/nexus";

type StateDetailSummaryGridProps = {
  state: StateSummary;
  formatCurrency: (value: number) => string;
};

export function StateDetailSummaryGrid({
  state,
  formatCurrency,
}: StateDetailSummaryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
      <div>
        <div className="mb-1 text-sm text-brand-muted">Nexus Threshold</div>
        <div className="text-xl font-bold text-brand-text">{formatCurrency(state.threshold)}</div>
        <div className="text-xs text-brand-muted">
          {state.thresholdType} sales / {state.window}
        </div>
        {(state.trackingStartDate || state.trackingEndDate) && (
          <div className="mt-1 text-xs text-brand-muted">
            Tracking: {state.trackingStartDate ?? "N/A"}{" "}
            {state.trackingEndDate ? `- ${state.trackingEndDate}` : ""}
          </div>
        )}
        {state.resetDate && (
          <div className="mt-1 text-xs text-brand-muted">Resets: {state.resetDate}</div>
        )}
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-muted">Current Sales</div>
        <div className="text-xl font-bold text-brand-text">
          {formatCurrency(state.relevantSales)}
        </div>
        <div className="text-xs text-brand-muted">
          {state.percentageToThreshold.toFixed(1)}% to threshold
        </div>
      </div>

      {state.isRegistered && (
        <div className="col-span-2 md:col-span-1">
          <div className="mb-1 flex items-center gap-1 text-sm text-brand-muted">
            <DollarSign className="h-4 w-4" />
            Tax Collected
          </div>
          <div className="text-xl font-bold text-emerald-700">
            {formatCurrency(state.taxCollected || 0)}
          </div>
          <div className="text-xs text-brand-muted">Tax owed to {state.stateCode}</div>
        </div>
      )}

      <div>
        <div className="mb-1 text-sm text-brand-muted">Total Sales</div>
        <div className="text-lg text-brand-text">{formatCurrency(state.totalSales)}</div>
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-muted">Taxable Sales</div>
        <div className="text-lg text-brand-text">{formatCurrency(state.taxableSales)}</div>
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-muted">Transactions</div>
        <div className="text-lg text-brand-text">{state.transactionCount}</div>
      </div>
    </div>
  );
}
