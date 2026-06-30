"use client";

import React, { useState } from "react";
import { AlertTriangle, DollarSign, ExternalLink, X } from "lucide-react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { STATE_REGISTRATION_URLS } from "@/config/constants/nexus-thresholds";
import type { StateSummary } from "@/types/domain/nexus";

type SalesLog = {
  order_id: string;
  created_at: string;
  total: number;
  tax_amount: number;
  customer_state: string;
  fulfillment: string;
  status: string;
};

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
  const [salesLog, setSalesLog] = useState<SalesLog[]>([]);
  const [salesLogTotal, setSalesLogTotal] = useState(0);
  const [salesLogPage, setSalesLogPage] = useState(0);
  const [loadingSalesLog, setLoadingSalesLog] = useState(false);
  const [hasCheckedSales, setHasCheckedSales] = useState(false);

  const hasSales = state.totalSales > 0 || state.transactionCount > 0;
  const needsStatePermit = state.nexusType === "physical" && !state.isRegistered;
  const approachingEconomicThreshold =
    state.nexusType === "economic" &&
    !state.isRegistered &&
    state.percentageToThreshold >= 95;

  const fetchSalesLog = async (offset: number = 0) => {
    try {
      setLoadingSalesLog(true);
      const res = await fetch(
        `/api/admin/nexus/sales-log?stateCode=${state.stateCode}&limit=10&offset=${offset}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error("Failed to fetch sales log");
      }

      const result = await res.json();
      setSalesLog(result.sales ?? []);
      setSalesLogTotal(result.total ?? 0);
      setHasCheckedSales(true);
    } catch (err) {
      console.error("Failed to fetch sales log:", err);
      setSalesLog([]);
      setSalesLogTotal(0);
      setHasCheckedSales(true);
    } finally {
      setLoadingSalesLog(false);
    }
  };

  const handleViewSalesLog = () => {
    if (!hasSales) {
      return;
    }
    setSalesLogPage(0);
    void fetchSalesLog(0);
  };

  const handleSalesLogPageChange = (newPage: number) => {
    setSalesLogPage(newPage);
    void fetchSalesLog(newPage * 10);
  };

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-brand-border px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">
              {state.stateName} ({state.stateCode})
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.isRegistered ? (
                <AdminStatusBadge tone="success">
                  State permit: Registered
                </AdminStatusBadge>
              ) : (
                <AdminStatusBadge tone="neutral">
                  State permit: Not registered
                </AdminStatusBadge>
              )}
              <AdminStatusBadge
                tone={state.nexusType === "physical" ? "warning" : "neutral"}
              >
                {state.nexusType === "physical" ? "Physical nexus" : "Economic nexus"}
              </AdminStatusBadge>
              {state.isHomeState && (
                <AdminStatusBadge tone="warning">Home Office State</AdminStatusBadge>
              )}
            </div>
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
          {needsStatePermit && (
            <div className="flex gap-2 border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="text-sm">
                <div className="font-semibold text-amber-800">
                  Physical nexus - state registration required
                </div>
                <div className="text-amber-700">
                  You have physical nexus in this state. Register for a state permit
                  before collecting sales tax.
                </div>
              </div>
            </div>
          )}

          {approachingEconomicThreshold && (
            <div className="flex gap-2 border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-700" />
              <div className="text-sm">
                <div className="font-semibold text-red-700">
                  Economic nexus threshold near/exceeded
                </div>
                <div className="text-red-700">
                  You&apos;ve reached {state.percentageToThreshold.toFixed(1)}% of the
                  nexus threshold ({formatCurrency(state.relevantSales)} of{" "}
                  {formatCurrency(state.threshold)}). Consider registering for a state
                  permit.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <div>
              <div className="mb-1 text-sm text-brand-muted">Nexus Threshold</div>
              <div className="text-xl font-bold text-brand-text">
                {formatCurrency(state.threshold)}
              </div>
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
                <div className="mt-1 text-xs text-brand-muted">
                  Resets: {state.resetDate}
                </div>
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
                <div className="text-xs text-brand-muted">
                  Tax owed to {state.stateCode}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1 text-sm text-brand-muted">Total Sales</div>
              <div className="text-lg text-brand-text">
                {formatCurrency(state.totalSales)}
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm text-brand-muted">Taxable Sales</div>
              <div className="text-lg text-brand-text">
                {formatCurrency(state.taxableSales)}
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm text-brand-muted">Transactions</div>
              <div className="text-lg text-brand-text">{state.transactionCount}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">Sales History</h3>
              {salesLog.length === 0 && (
                <button
                  onClick={handleViewSalesLog}
                  disabled={!hasSales || loadingSalesLog}
                  className={[
                    adminButtonStyles.secondary,
                    !hasSales ? "cursor-not-allowed opacity-40" : "",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  ].join(" ")}
                  title={!hasSales ? "No sales in this state yet" : "View all sales"}
                >
                  {loadingSalesLog
                    ? "Loading..."
                    : !hasSales
                      ? "No Sales Yet"
                      : "View All Sales"}
                </button>
              )}
            </div>

            {!hasSales && !hasCheckedSales && (
              <AdminSectionCard>
                <div className="text-center text-brand-muted">
                  No sales recorded for this state yet
                </div>
              </AdminSectionCard>
            )}

            {salesLog.length > 0 && (
              <div className="space-y-4">
                <div className="overflow-hidden border border-brand-border">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-page">
                      <tr>
                        <th className="px-4 py-2 text-left text-brand-text">Date</th>
                        <th className="px-4 py-2 text-left text-brand-text">Order ID</th>
                        <th className="px-4 py-2 text-right text-brand-text">Total</th>
                        <th className="px-4 py-2 text-right text-brand-text">Tax</th>
                        <th className="px-4 py-2 text-left text-brand-text">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {salesLog.map((sale) => (
                        <tr key={sale.order_id} className="hover:bg-brand-page">
                          <td className="px-4 py-2 text-brand-muted">
                            {formatDate(sale.created_at)}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-brand-muted">
                            {sale.order_id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-2 text-right text-brand-text">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-emerald-700">
                            {formatCurrency(sale.tax_amount)}
                          </td>
                          <td className="px-4 py-2 capitalize text-brand-muted">
                            {sale.fulfillment}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-brand-muted">
                    Showing {salesLogPage * 10 + 1} to{" "}
                    {Math.min((salesLogPage + 1) * 10, salesLogTotal)} of {salesLogTotal}{" "}
                    sales
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSalesLogPageChange(salesLogPage - 1)}
                      disabled={salesLogPage === 0 || loadingSalesLog}
                      className={`${adminButtonStyles.secondary} disabled:opacity-50`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleSalesLogPageChange(salesLogPage + 1)}
                      disabled={
                        (salesLogPage + 1) * 10 >= salesLogTotal || loadingSalesLog
                      }
                      className={`${adminButtonStyles.secondary} disabled:opacity-50`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!state.isHomeState && (
            <div className="flex gap-3">
              <button
                onClick={() => onNexusTypeChange(state.stateCode, "physical")}
                disabled={isUpdating}
                className={[
                  "border px-4 py-2 text-sm",
                  state.nexusType === "physical"
                    ? "border-brand-text bg-brand-text text-brand-page"
                    : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
              >
                Physical Nexus
              </button>
              <button
                onClick={() => onNexusTypeChange(state.stateCode, "economic")}
                disabled={isUpdating}
                className={[
                  "border px-4 py-2 text-sm",
                  state.nexusType === "economic"
                    ? "border-brand-text bg-brand-text text-brand-page"
                    : "border-brand-border bg-brand-surface text-brand-text hover:bg-brand-page",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
              >
                Economic Nexus
              </button>
            </div>
          )}

          <div className="border border-brand-border bg-brand-page p-4">
            <div className="mb-2 text-sm font-semibold text-brand-text">
              Registration & setup
            </div>
            <div className="text-sm text-brand-muted">
              Mark your <span className="font-medium text-brand-text">state permit</span>{" "}
              status here, and use the resources to complete state registration.
            </div>

            {!isHomeOfficeConfigured && (
              <div className="mt-3 text-xs text-amber-700">
                Home Office is required for tax registrations (Settings &gt; Home Office).
                <button
                  onClick={onOpenHomeOffice}
                  className="ml-2 underline underline-offset-2 hover:text-amber-900"
                >
                  Open Home Office
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  onRegisterToggle(state.stateCode, state.isRegistered, state.nexusType)
                }
                disabled={isUpdating}
                className={[
                  state.isRegistered
                    ? adminButtonStyles.secondary
                    : adminButtonStyles.primary,
                  "px-3 py-1.5 text-sm",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
                title={
                  state.isRegistered ? "Mark as not registered" : "Mark as registered"
                }
              >
                {state.isRegistered
                  ? "Mark permit as not registered"
                  : "Mark permit as registered"}
              </button>

              {STATE_REGISTRATION_URLS[state.stateCode] && (
                <a
                  href={STATE_REGISTRATION_URLS[state.stateCode]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${adminButtonStyles.secondary} gap-2 px-3 py-1.5 text-sm`}
                >
                  State registration site <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
