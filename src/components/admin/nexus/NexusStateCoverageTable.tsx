import { AlertCircle, AlertTriangle } from "lucide-react";

import {
  getSortIndicator,
  getStateColor,
} from "@/components/admin/nexus/nexusTrackerView";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import type { StateSummary } from "@/types/domain/nexus";

type NexusStateCoverageTableProps = {
  formatCurrency: (value: number) => string;
  onSelectState: (state: StateSummary) => void;
  onSort: (field: keyof StateSummary) => void;
  sortDirection: "asc" | "desc";
  sortField: keyof StateSummary;
  states: StateSummary[];
};

export function NexusStateCoverageTable({
  formatCurrency,
  onSelectState,
  onSort,
  sortDirection,
  sortField,
  states,
}: NexusStateCoverageTableProps) {
  return (
    <AdminSectionCard title="State Coverage">
      <div className="overflow-hidden border border-brand-border">
        <table className="w-full text-[12px] sm:text-sm">
          <thead className="bg-brand-page">
            <tr>
              <th
                className="cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30"
                onClick={() => onSort("stateName")}
              >
                State {getSortIndicator(sortField, sortDirection, "stateName")}
              </th>
              <th
                className="hidden cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30 md:table-cell"
                onClick={() => onSort("threshold")}
              >
                Threshold {getSortIndicator(sortField, sortDirection, "threshold")}
              </th>
              <th
                className="hidden cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30 md:table-cell"
                onClick={() => onSort("relevantSales")}
              >
                Sales {getSortIndicator(sortField, sortDirection, "relevantSales")}
              </th>
              <th
                className="hidden cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30 md:table-cell"
                onClick={() => onSort("percentageToThreshold")}
              >
                Progress{" "}
                {getSortIndicator(sortField, sortDirection, "percentageToThreshold")}
              </th>
              <th className="hidden px-3 py-3 text-left font-medium text-brand-text md:table-cell">
                Type
              </th>
              <th className="hidden px-3 py-3 text-left font-medium text-brand-text md:table-cell">
                Status
              </th>
              <th className="px-3 py-3 text-left font-medium text-brand-text">
                <span className="hidden md:inline">Actions</span>
                <span className="md:hidden">Details</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-brand-border">
            {states.map((state) => (
              <tr key={state.stateCode} className="hover:bg-brand-page">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: getStateColor(state) }}
                    />
                    <span className="font-medium text-brand-text">{state.stateName}</span>
                    {state.isHomeState && (
                      <AdminStatusBadge tone="warning">Home</AdminStatusBadge>
                    )}
                    {state.nexusType === "physical" && !state.isRegistered && (
                      <span
                        title="Physical nexus - needs registration"
                        className="inline-flex"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-brand-muted md:table-cell">
                  {formatCurrency(state.threshold)}
                </td>
                <td className="hidden px-3 py-3 text-brand-muted md:table-cell">
                  {formatCurrency(state.relevantSales)}
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-border/80">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(state.percentageToThreshold, 100)}%`,
                          backgroundColor: getStateColor(state),
                        }}
                      />
                    </div>
                    <span className="w-12 text-xs text-brand-muted">
                      {state.percentageToThreshold.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <AdminStatusBadge
                    tone={state.nexusType === "physical" ? "warning" : "neutral"}
                  >
                    {state.nexusType}
                  </AdminStatusBadge>
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  {state.isRegistered ? (
                    <AdminStatusBadge tone="success">Registered</AdminStatusBadge>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-brand-muted">
                      <AlertCircle className="h-4 w-4 text-brand-muted" />
                      Not Registered
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => onSelectState(state)}
                    className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-text underline-offset-2 hover:underline sm:text-sm"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {states.length === 0 && (
          <div className="p-8">
            <AdminEmptyState
              title="No Matching States"
              description="Adjust your filters to expand the result set."
            />
          </div>
        )}
      </div>
    </AdminSectionCard>
  );
}
