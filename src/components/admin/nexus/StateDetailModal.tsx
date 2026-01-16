// src/components/admin/nexus/StateDetailModal.tsx
"use client";

import React, { useState } from "react";
import { X, AlertTriangle, ExternalLink, CheckCircle, DollarSign } from "lucide-react";
import {
  STATE_REGISTRATION_URLS,
  STRIPE_REGISTRATION_GUIDES,
} from "@/config/constants/nexus-thresholds";
import type { StateSummary } from "@/types/domain/nexus";
import { ModalPortal } from "@/components/ui/ModalPortal";

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

  // Keep existing signature: treat as "state permit registered" toggle
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

  const fetchSalesLog = async (offset: number = 0) => {
    try {
      setLoadingSalesLog(true);
      const res = await fetch(
        `/api/admin/nexus/sales-log?stateCode=${state.stateCode}&limit=10&offset=${offset}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to fetch sales log");

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
    if (!hasSales) return;
    setSalesLogPage(0);
    fetchSalesLog(0);
  };

  const handleSalesLogPageChange = (newPage: number) => {
    setSalesLogPage(newPage);
    fetchSalesLog(newPage * 10);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Warnings tuned to the new meaning:
  // - State permit missing
  const needsStatePermit = state.nexusType === "physical" && !state.isRegistered;

  // - State permit exists but Stripe not active (guide link helps)
  const needsStripeSetup = state.isRegistered && !state.stripeRegistered;

  // Economic approaching threshold (only if not registered)
  const approachingEconomicThreshold =
    state.nexusType === "economic" && !state.isRegistered && state.percentageToThreshold >= 95;

  const onToggleStatePermit = () => {
    onRegisterToggle(state.stateCode, state.isRegistered, state.nexusType);
  };

  return (
    <ModalPortal open={true} onClose={onClose}>
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-800/70 rounded-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800/70">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {state.stateName} ({state.stateCode})
            </h2>

            <div className="flex gap-2 mt-2 flex-wrap">
              {state.isRegistered ? (
                <span className="px-2 py-1 bg-zinc-900 border border-zinc-800/70 text-white text-xs rounded-sm flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  State permit: Registered
                </span>
              ) : (
                <span className="px-2 py-1 bg-zinc-900 border border-zinc-800/70 text-zinc-300 text-xs rounded-sm">
                  State permit: Not registered
                </span>
              )}

              {state.stripeRegistered ? (
                <span className="px-2 py-1 bg-green-600/15 border border-green-600/25 text-green-300 text-xs rounded-sm">
                  Stripe Tax: Active
                </span>
              ) : (
                <span className="px-2 py-1 bg-zinc-900 border border-zinc-800/70 text-zinc-300 text-xs rounded-sm">
                  Stripe Tax: Not active
                </span>
              )}

              <span className="px-2 py-1 bg-zinc-900 border border-zinc-800/70 text-white text-xs rounded-sm">
                {state.nexusType === "physical" ? "Physical nexus" : "Economic nexus"}
              </span>

              {state.isHomeState && (
                <span className="px-2 py-1 bg-red-600/10 border border-red-600/25 text-red-300 text-xs rounded-sm">
                  Home Office State
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 border border-zinc-800/70 hover:border-zinc-600 rounded-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Warning banners */}
          {needsStatePermit && (
            <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-sm flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-yellow-300">
                  Physical nexus — state registration required
                </div>
                <div className="text-zinc-300">
                  You have physical nexus in this state. Register for a state permit before collecting sales tax.
                </div>
              </div>
            </div>
          )}

          {approachingEconomicThreshold && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-sm flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-red-300">Economic nexus threshold near/exceeded</div>
                <div className="text-zinc-300">
                  You&apos;ve reached {state.percentageToThreshold.toFixed(1)}% of the nexus threshold
                  ({formatCurrency(state.relevantSales)} of {formatCurrency(state.threshold)}). Consider
                  registering for a state permit.
                </div>
              </div>
            </div>
          )}

          {needsStripeSetup && (
            <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-sm flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-yellow-300">Stripe Tax not active</div>
                <div className="text-zinc-300">
                  You marked the state permit as registered, but Stripe Tax is not active for this state yet.
                  Use the Stripe walkthrough link below to finish setup in Stripe.
                </div>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Nexus Threshold</div>
              <div className="text-xl font-bold text-white">{formatCurrency(state.threshold)}</div>

              <div className="text-xs text-zinc-500">
                {state.thresholdType} sales / {state.window}
              </div>

              {(state.trackingStartDate || state.trackingEndDate) && (
                <div className="text-xs text-zinc-500 mt-1">
                  Tracking:{" "}
                  {state.trackingStartDate ?? "—"}{" "}
                  {state.trackingEndDate ? `→ ${state.trackingEndDate}` : ""}
                </div>
              )}

              {state.resetDate && (
                <div className="text-xs text-zinc-500 mt-1">Resets: {state.resetDate}</div>
              )}
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Current Sales</div>
              <div className="text-xl font-bold text-white">{formatCurrency(state.relevantSales)}</div>
              <div className="text-xs text-zinc-500">
                {state.percentageToThreshold.toFixed(1)}% to threshold
              </div>
            </div>

            {state.isRegistered && (
              <div className="col-span-2 md:col-span-1">
                <div className="text-sm text-zinc-400 mb-1 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Tax Collected
                </div>
                <div className="text-xl font-bold text-green-400">
                  {formatCurrency(state.taxCollected || 0)}
                </div>
                <div className="text-xs text-zinc-500">Tax owed to {state.stateCode}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-zinc-400 mb-1">Total Sales</div>
              <div className="text-lg text-white">{formatCurrency(state.totalSales)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Taxable Sales</div>
              <div className="text-lg text-white">{formatCurrency(state.taxableSales)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Transactions</div>
              <div className="text-lg text-white">{state.transactionCount}</div>
            </div>
          </div>

          {/* Sales Log (unchanged) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Sales History</h3>

              {salesLog.length === 0 && (
                <button
                  onClick={handleViewSalesLog}
                  disabled={!hasSales || loadingSalesLog}
                  className={[
                    "px-4 py-2 rounded-sm text-sm border border-zinc-800/70",
                    !hasSales
                      ? "bg-zinc-900 text-zinc-600 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-500 text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  ].join(" ")}
                  title={!hasSales ? "No sales in this state yet" : "View all sales"}
                >
                  {loadingSalesLog ? "Loading..." : !hasSales ? "No Sales Yet" : "View All Sales"}
                </button>
              )}
            </div>

            {!hasSales && !hasCheckedSales && (
              <div className="p-4 bg-zinc-900 border border-zinc-800/70 rounded-sm text-center text-zinc-400">
                No sales recorded for this state yet
              </div>
            )}

            {salesLog.length > 0 && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800/70 rounded-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950">
                      <tr>
                        <th className="px-4 py-2 text-left text-white">Date</th>
                        <th className="px-4 py-2 text-left text-white">Order ID</th>
                        <th className="px-4 py-2 text-right text-white">Total</th>
                        <th className="px-4 py-2 text-right text-white">Tax</th>
                        <th className="px-4 py-2 text-left text-white">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {salesLog.map((sale) => (
                        <tr key={sale.order_id} className="hover:bg-zinc-900/60">
                          <td className="px-4 py-2 text-zinc-300">{formatDate(sale.created_at)}</td>
                          <td className="px-4 py-2 text-zinc-300 font-mono text-xs">
                            {sale.order_id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-2 text-right text-white">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="px-4 py-2 text-right text-green-400 font-medium">
                            {formatCurrency(sale.tax_amount)}
                          </td>
                          <td className="px-4 py-2 text-zinc-300 capitalize">{sale.fulfillment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-zinc-400">
                    Showing {salesLogPage * 10 + 1} to{" "}
                    {Math.min((salesLogPage + 1) * 10, salesLogTotal)} of {salesLogTotal} sales
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSalesLogPageChange(salesLogPage - 1)}
                      disabled={salesLogPage === 0 || loadingSalesLog}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800/70 text-white rounded-sm hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleSalesLogPageChange(salesLogPage + 1)}
                      disabled={(salesLogPage + 1) * 10 >= salesLogTotal || loadingSalesLog}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800/70 text-white rounded-sm hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nexus type toggle (unchanged) */}
          {!state.isHomeState && (
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => onNexusTypeChange(state.stateCode, "physical")}
                disabled={isUpdating}
                className={[
                  "px-4 py-2 rounded-sm text-sm border border-zinc-800/70",
                  state.nexusType === "physical"
                    ? "bg-red-600 text-white"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                Physical Nexus
              </button>
              <button
                onClick={() => onNexusTypeChange(state.stateCode, "economic")}
                disabled={isUpdating}
                className={[
                  "px-4 py-2 rounded-sm text-sm border border-zinc-800/70",
                  state.nexusType === "economic"
                    ? "bg-red-600 text-white"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                Economic Nexus
              </button>
            </div>
          )}

          {/* Registration / Setup */}
          <div className="mt-2 p-4 bg-zinc-900 border border-zinc-800/70 rounded-sm">
            <div className="text-sm text-zinc-200 font-semibold mb-2">
              Registration & setup
            </div>

            <div className="text-sm text-zinc-300">
              Mark your <span className="text-white font-medium">state permit</span> status here, and
              use the resources to complete state + Stripe setup.
            </div>

            {!isHomeOfficeConfigured && (
              <div className="mt-3 text-xs text-yellow-300">
                Stripe Tax setup is easier if your <span className="font-semibold">Home Office</span>{" "}
                is configured (Settings → Home Office).
                <button
                  onClick={onOpenHomeOffice}
                  className="ml-2 underline underline-offset-2 hover:text-yellow-200"
                >
                  Open Home Office
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Primary action: small + clear */}
              <button
                onClick={onToggleStatePermit}
                disabled={isUpdating}
                className={[
                  "px-3 py-1.5 rounded-sm text-sm border border-zinc-800/70",
                  state.isRegistered
                    ? "bg-zinc-950 text-zinc-200 hover:bg-zinc-800"
                    : "bg-red-600 text-white hover:bg-red-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
                title={state.isRegistered ? "Mark as not registered" : "Mark as registered"}
              >
                {state.isRegistered ? "Mark permit as not registered" : "Mark permit as registered"}
              </button>

              {/* Resource links: small, not “steps” */}
              {STATE_REGISTRATION_URLS[state.stateCode] && (
                <a
                  href={STATE_REGISTRATION_URLS[state.stateCode]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 rounded-sm border border-zinc-800/70 text-sm flex items-center gap-2"
                >
                  State registration site <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {STRIPE_REGISTRATION_GUIDES[state.stateCode] && (
                <a
                  href={STRIPE_REGISTRATION_GUIDES[state.stateCode]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 rounded-sm border border-zinc-800/70 text-sm flex items-center gap-2"
                >
                  Stripe walkthrough <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
