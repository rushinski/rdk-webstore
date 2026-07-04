"use client";

import React from "react";
import { X } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import { StateDetailAlerts } from "@/modules/nexus/presentation/admin/StateDetailAlerts";
import { StateDetailStatusBadges } from "@/modules/nexus/presentation/admin/StateDetailStatusBadges";
import { StateDetailSummaryGrid } from "@/modules/nexus/presentation/admin/StateDetailSummaryGrid";
import { StateRegistrationSetupSection } from "@/modules/nexus/presentation/admin/StateRegistrationSetupSection";
import { StateSalesHistorySection } from "@/modules/nexus/presentation/admin/StateSalesHistorySection";
import { useStateDetailSalesLog } from "@/modules/nexus/presentation/admin/useStateDetailSalesLog";
import type { StateSummary } from "@/types/domain/nexus";

type StateDetailModalProps = {
  state: StateSummary;
  onClose: () => void;
  onRegisterToggle: (
    stateCode: string,
    currentRegistered: boolean,
    nexusType: "physical" | "economic",
  ) => void;
  onNexusTypeChange: (stateCode: string, newType: "physical" | "economic") => void;
  isUpdating: boolean;
  formatCurrency: (val: number) => string;
  isHomeOfficeConfigured: boolean;
  onOpenHomeOffice: () => void;
};

export default function StateDetailModal({
  state,
  onClose,
  onRegisterToggle,
  onNexusTypeChange,
  isUpdating,
  formatCurrency,
  isHomeOfficeConfigured,
  onOpenHomeOffice,
}: StateDetailModalProps) {
  const hasSales = state.totalSales > 0 || state.transactionCount > 0;
  const {
    handleSalesLogPageChange,
    handleViewSalesLog,
    hasCheckedSales,
    loadingSalesLog,
    salesLog,
    salesLogPage,
    salesLogTotal,
  } = useStateDetailSalesLog(state.stateCode, hasSales);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <ModalPortal open={true} onClose={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-brand-border bg-brand-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-brand-border px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">
              {state.stateName} ({state.stateCode})
            </h2>
            <StateDetailStatusBadges state={state} />
          </div>

          <button
            onClick={onClose}
            className="border border-brand-border p-2 hover:bg-brand-page"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-brand-muted" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <StateDetailAlerts state={state} formatCurrency={formatCurrency} />

          <StateDetailSummaryGrid state={state} formatCurrency={formatCurrency} />

          <StateSalesHistorySection
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            hasCheckedSales={hasCheckedSales}
            hasSales={hasSales}
            loadingSalesLog={loadingSalesLog}
            onSalesLogPageChange={handleSalesLogPageChange}
            onViewSalesLog={handleViewSalesLog}
            salesLog={salesLog}
            salesLogPage={salesLogPage}
            salesLogTotal={salesLogTotal}
          />

          <StateRegistrationSetupSection
            isHomeOfficeConfigured={isHomeOfficeConfigured}
            isUpdating={isUpdating}
            onNexusTypeChange={onNexusTypeChange}
            onOpenHomeOffice={onOpenHomeOffice}
            onRegisterToggle={onRegisterToggle}
            state={state}
          />
        </div>
      </div>
    </ModalPortal>
  );
}
