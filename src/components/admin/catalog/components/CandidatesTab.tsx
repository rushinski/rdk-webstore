"use client";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

import type { Candidate } from "../types";

import { catalogStyles } from "./catalogStyles";

type CandidatesTabProps = {
  isLoading: boolean;
  candidates: Candidate[];
  onAcceptCandidate: (candidate: Candidate) => void;
  onRejectCandidate: (candidate: Candidate) => void;
  resolveBrandLabel: (brandId?: string | null) => string;
};

export function CandidatesTab({
  isLoading,
  candidates,
  onAcceptCandidate,
  onRejectCandidate,
  resolveBrandLabel,
}: CandidatesTabProps) {
  return (
    <AdminSectionCard title="Candidates">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-brand-text">Pending Candidates</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Review unknown brands and models created during product entry.
        </p>
      </div>

      {isLoading ? (
        <AdminEmptyState
          title="Loading Candidates"
          description="Checking pending parser candidates now."
        />
      ) : candidates.length === 0 ? (
        <AdminEmptyState
          title="No Pending Candidates"
          description="There are no unresolved brand or model candidates right now."
        />
      ) : (
        <div className={catalogStyles.tableWrap}>
          <table className="w-full text-sm">
            <thead>
              <tr className={catalogStyles.tableHeadRow}>
                <th className={catalogStyles.tableHeadCell}>Candidate</th>
                <th className={`${catalogStyles.tableHeadCell} hidden sm:table-cell`}>
                  Brand
                </th>
                <th className={`${catalogStyles.tableHeadCell} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} className={catalogStyles.tableRow}>
                  <td className={catalogStyles.tableCell}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-brand-text">
                        {candidate.raw_text}
                      </div>
                      <AdminStatusBadge
                        tone={candidate.entity_type === "brand" ? "neutral" : "warning"}
                      >
                        {candidate.entity_type}
                      </AdminStatusBadge>
                    </div>
                    {candidate.entity_type === "model" ? (
                      <div className="mt-1 text-xs text-brand-muted sm:hidden">
                        {resolveBrandLabel(candidate.parent_brand_id)}
                      </div>
                    ) : null}
                  </td>
                  <td
                    className={`${catalogStyles.tableCell} hidden text-brand-muted sm:table-cell`}
                  >
                    {candidate.entity_type === "model"
                      ? resolveBrandLabel(candidate.parent_brand_id)
                      : "-"}
                  </td>
                  <td className={`${catalogStyles.tableCell} text-right`}>
                    <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onAcceptCandidate(candidate)}
                        className="inline-flex items-center justify-center border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectCandidate(candidate)}
                        className={adminButtonStyles.secondary}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSectionCard>
  );
}
