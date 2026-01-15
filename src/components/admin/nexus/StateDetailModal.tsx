// src/components/admin/nexus/StateDetailModal.tsx
"use client";

import React, { useState } from "react";
import { X, AlertTriangle, ExternalLink } from "lucide-react";
import { STATE_REGISTRATION_URLS } from "@/config/constants/nexus-thresholds";

type StateSummary = {
  stateCode: string;
  stateName: string;
  threshold: number;
  thresholdType: string;
  window: string;
  totalSales: number;
  taxableSales: number;
  transactionCount: number;
  relevantSales: number;
  percentageToThreshold: number;
  isRegistered: boolean;
  nexusType: 'physical' | 'economic';
  isHomeState: boolean;
  taxable: boolean;
  notes?: string;
  exemption?: number;
  marginal?: boolean;
  allOrNothing?: boolean;
  transactionThreshold?: number;
  meetsTransactionThreshold?: boolean;
  both?: boolean;
  stripeRegistered?: boolean;
  resetDate?: string;
};

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
  onRegisterToggle: (stateCode: string, currentRegistered: boolean, nexusType: 'physical' | 'economic') => void;
  onNexusTypeChange: (stateCode: string, newType: 'physical' | 'economic') => void;
  isUpdating: boolean;
  formatCurrency: (val: number) => string;
};

export default function StateDetailModal({
  state,
  onClose,
  onRegisterToggle,
  onNexusTypeChange,
  isUpdating,
  formatCurrency
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
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Failed to fetch sales log");

      const result = await res.json();
      setSalesLog(result.sales);
      setSalesLogTotal(result.total);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{state.stateName}</h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              {state.isRegistered && (
                <span className="px-2 py-1 bg-gray-700 text-white text-xs rounded">
                  Registered Locally
                </span>
              )}
              {state.stripeRegistered && (
                <span className="px-2 py-1 bg-green-700 text-white text-xs rounded">
                  Registered with Stripe
                </span>
              )}
              <span className="px-2 py-1 bg-zinc-800 text-white text-xs rounded">
                {state.nexusType}
              </span>
              {state.isHomeState && (
                <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
                  Home State
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {state.nexusType === 'physical' && !state.stripeRegistered && (
          <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-800 rounded flex gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-yellow-500">Physical Nexus - Register with Stripe</div>
              <div className="text-gray-300">
                This state has physical nexus and must be registered with Stripe Tax to collect taxes automatically.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Nexus Threshold</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(state.threshold)}
            </div>
            <div className="text-xs text-gray-500">
              {state.thresholdType} sales / {state.window}
            </div>
            {state.resetDate && (
              <div className="text-xs text-gray-500 mt-1">
                Resets: {state.resetDate}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Sales</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(state.relevantSales)}
            </div>
            <div className="text-xs text-gray-500">
              {state.percentageToThreshold.toFixed(1)}% to threshold
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Sales</div>
            <div className="text-lg text-white">
              {formatCurrency(state.totalSales)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Transactions</div>
            <div className="text-lg text-white">{state.transactionCount}</div>
          </div>
        </div>

        {/* Sales Log Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Sales History</h3>
            {salesLog.length === 0 && (
              <button
                onClick={handleViewSalesLog}
                disabled={!hasSales || loadingSalesLog}
                className={`px-4 py-2 rounded text-sm ${
                  !hasSales
                    ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:opacity-50`}
                title={!hasSales ? "No sales in this state yet" : "View all sales"}
              >
                {loadingSalesLog ? "Loading..." : !hasSales ? "No Sales Yet" : "View All Sales"}
              </button>
            )}
          </div>

          {!hasSales && !hasCheckedSales && (
            <div className="p-4 bg-zinc-800 rounded-lg text-center text-gray-400">
              No sales recorded for this state yet
            </div>
          )}

          {salesLog.length > 0 && (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-white">Date</th>
                      <th className="px-4 py-2 text-left text-white">Order ID</th>
                      <th className="px-4 py-2 text-right text-white">Total</th>
                      <th className="px-4 py-2 text-right text-white">Tax</th>
                      <th className="px-4 py-2 text-left text-white">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {salesLog.map((sale) => (
                      <tr key={sale.order_id}>
                        <td className="px-4 py-2 text-gray-300">{formatDate(sale.created_at)}</td>
                        <td className="px-4 py-2 text-gray-300 font-mono text-xs">{sale.order_id.slice(0, 8)}...</td>
                        <td className="px-4 py-2 text-right text-white">{formatCurrency(sale.total)}</td>
                        <td className="px-4 py-2 text-right text-gray-300">{formatCurrency(sale.tax_amount)}</td>
                        <td className="px-4 py-2 text-gray-300 capitalize">{sale.fulfillment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Showing {salesLogPage * 10 + 1} to {Math.min((salesLogPage + 1) * 10, salesLogTotal)} of {salesLogTotal} sales
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSalesLogPageChange(salesLogPage - 1)}
                    disabled={salesLogPage === 0 || loadingSalesLog}
                    className="px-4 py-2 bg-zinc-800 text-white rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleSalesLogPageChange(salesLogPage + 1)}
                    disabled={(salesLogPage + 1) * 10 >= salesLogTotal || loadingSalesLog}
                    className="px-4 py-2 bg-zinc-800 text-white rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {!state.isHomeState && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => onNexusTypeChange(state.stateCode, "physical")}
              disabled={isUpdating}
              className={`px-4 py-2 rounded text-sm ${
                state.nexusType === "physical"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Physical Nexus
            </button>
            <button
              onClick={() => onNexusTypeChange(state.stateCode, "economic")}
              disabled={isUpdating}
              className={`px-4 py-2 rounded text-sm ${
                state.nexusType === "economic"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Economic Nexus
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() =>
              onRegisterToggle(
                state.stateCode,
                state.isRegistered,
                state.nexusType
              )
            }
            disabled={isUpdating}
            className={`px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              state.isRegistered
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {state.isRegistered ? "Unregister" : "Register with Stripe"}
          </button>
          {STATE_REGISTRATION_URLS[state.stateCode] && (
            <a
              href={STATE_REGISTRATION_URLS[state.stateCode]}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-medium flex items-center gap-2"
            >
              Register in {state.stateCode}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}