// src/components/admin/NexusTrackerClient.tsx

"use client";

import { useState, useEffect } from "react";
import { AlertCircle, ExternalLink, CheckCircle, XCircle, TrendingUp, X, AlertTriangle } from "lucide-react";
import { USMap } from "./USMap";

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

type NexusData = {
  homeState: string;
  states: StateSummary[];
};

const STATE_REGISTRATION_URLS: Record<string, string> = {
  AL: 'https://www.revenue.alabama.gov/sales-use/registration/',
  AZ: 'https://azdor.gov/business/transaction-privilege-tax',
  CA: 'https://onlineservices.cdtfa.ca.gov/_/',
  FL: 'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
  GA: 'https://dor.georgia.gov/sales-use-tax',
  IL: 'https://tax.illinois.gov/businesses/registration.html',
  NY: 'https://www.tax.ny.gov/bus/st/stidx.htm',
  NC: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax',
  OH: 'https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use',
  PA: 'https://www.revenue.pa.gov/TaxTypes/SUT/Pages/default.aspx',
  SC: 'https://dor.sc.gov/tax/sales',
  TX: 'https://comptroller.texas.gov/taxes/sales/',
  VA: 'https://www.tax.virginia.gov/sales-and-use-tax',
  WA: 'https://dor.wa.gov/taxes-rates/sales-use-tax',
};

export function NexusTrackerClient() {
  const [data, setData] = useState<NexusData | null>(null);
  const [selectedState, setSelectedState] = useState<StateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchNexusData();
  }, []);

  const fetchNexusData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/nexus/summary", { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }

      const json = await res.json();
      setData(json as NexusData);
    } catch (err) {
      console.error("Failed to fetch nexus data:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: StateSummary | undefined) => {
    if (!state) return "#374151";
    if (state.isRegistered) return "#6b7280";

    const pct = state.percentageToThreshold;
    if (pct < 50) return "#10b981";
    if (pct < 70) return "#84cc16";
    if (pct < 85) return "#eab308";
    if (pct < 95) return "#f97316";
    return "#ef4444";
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  const handleRegisterToggle = async (
    stateCode: string,
    currentRegistered: boolean,
    nexusType: 'physical' | 'economic'
  ) => {
    try {
      setIsUpdating(true);
      await fetch("/api/admin/nexus/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode,
          registrationType: nexusType,
          isRegistered: !currentRegistered,
        }),
      });
      
      await fetchNexusData();
      
      if (selectedState?.stateCode === stateCode) {
        const updatedState = data?.states.find(s => s.stateCode === stateCode);
        if (updatedState) {
          setSelectedState({ ...updatedState, isRegistered: !currentRegistered });
        }
      }
    } catch (err) {
      console.error("Failed to toggle registration:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNexusTypeChange = async (stateCode: string, newType: 'physical' | 'economic') => {
    try {
      setIsUpdating(true);
      await fetch("/api/admin/nexus/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode,
          registrationType: newType,
          isRegistered: true,
        }),
      });
      
      await fetchNexusData();
      
      if (selectedState?.stateCode === stateCode) {
        const updatedState = data?.states.find(s => s.stateCode === stateCode);
        if (updatedState) {
          setSelectedState({ ...updatedState, nexusType: newType });
        }
      }
    } catch (err) {
      console.error("Failed to change nexus type:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading nexus data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-white">Failed to load nexus data</div>
      </div>
    );
  }

  const atRiskStates = data.states.filter(
    (s) => !s.isRegistered && s.percentageToThreshold >= 85
  ).length;

  const registeredStates = data.states.filter((s) => s.isRegistered).length;

  const needsStripeRegistration = data.states.filter(
    (s) => s.nexusType === 'physical' && s.isRegistered && !s.stripeRegistered
  ).length;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Sales Tax Nexus Tracker</h1>
        <p className="text-gray-400">
          Monitor your sales tax obligations across all US states
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Registered States</p>
              <p className="text-3xl font-bold text-white">{registeredStates}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">At Risk States</p>
              <p className="text-3xl font-bold text-white">{atRiskStates}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        {needsStripeRegistration > 0 && (
          <div className="bg-zinc-900 border border-yellow-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Needs Stripe Registration</p>
                <p className="text-3xl font-bold text-yellow-500">{needsStripeRegistration}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Home State</p>
              <p className="text-3xl font-bold text-white">{data.homeState}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-600 rounded" />
          <span className="text-sm text-gray-400">Registered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span className="text-sm text-gray-400">&lt;50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-lime-500 rounded" />
          <span className="text-sm text-gray-400">50-70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded" />
          <span className="text-sm text-gray-400">70-85%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded" />
          <span className="text-sm text-gray-400">85-95%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-sm text-gray-400">&gt;95%</span>
        </div>
      </div>

      {/* US Map */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h2 className="text-xl font-bold text-white mb-6">United States Nexus Map</h2>
        <USMap 
          states={data.states}
          onStateClick={setSelectedState}
          getStateColor={getStateColor}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Modal Overlay for State Details */}
      {selectedState && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedState(null)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedState.stateName}</h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {selectedState.isRegistered && (
                    <span className="px-2 py-1 bg-gray-700 text-white text-xs rounded">
                      Registered Locally
                    </span>
                  )}
                  {selectedState.stripeRegistered && (
                    <span className="px-2 py-1 bg-green-700 text-white text-xs rounded">
                      Registered with Stripe
                    </span>
                  )}
                  <span className="px-2 py-1 bg-zinc-800 text-white text-xs rounded">
                    {selectedState.nexusType}
                  </span>
                  {selectedState.isHomeState && (
                    <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
                      Home State
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedState(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedState.nexusType === 'physical' && !selectedState.stripeRegistered && (
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
                  {formatCurrency(selectedState.threshold)}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedState.thresholdType} sales / {selectedState.window}
                </div>
                {selectedState.resetDate && (
                  <div className="text-xs text-gray-500 mt-1">
                    Resets: {selectedState.resetDate}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Sales</div>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(selectedState.relevantSales)}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedState.percentageToThreshold.toFixed(1)}% to threshold
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Sales</div>
                <div className="text-lg text-white">
                  {formatCurrency(selectedState.totalSales)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Transactions</div>
                <div className="text-lg text-white">{selectedState.transactionCount}</div>
              </div>
            </div>

            {selectedState.transactionThreshold && (
              <div className="mb-6 p-3 bg-zinc-800 rounded">
                <div className="text-sm text-gray-400">Transaction Requirement</div>
                <div className="text-sm text-white">
                  {selectedState.transactionCount} / {selectedState.transactionThreshold} transactions
                  {selectedState.both && " (BOTH thresholds required)"}
                </div>
              </div>
            )}

            {!selectedState.taxable && (
              <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-800 rounded flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold text-yellow-500">Product Tax Exemption</div>
                  {selectedState.exemption && (
                    <div className="text-gray-300">
                      Sneakers/clothing exempt{" "}
                      {selectedState.marginal
                        ? `under $${selectedState.exemption} (marginal)`
                        : selectedState.allOrNothing
                          ? `under $${selectedState.exemption} (all or nothing)`
                          : ""}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedState.isHomeState && (
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleNexusTypeChange(selectedState.stateCode, "physical")}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded text-sm ${
                    selectedState.nexusType === "physical"
                      ? "bg-red-600 text-white"
                      : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Physical Nexus
                </button>
                <button
                  onClick={() => handleNexusTypeChange(selectedState.stateCode, "economic")}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded text-sm ${
                    selectedState.nexusType === "economic"
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
                  handleRegisterToggle(
                    selectedState.stateCode,
                    selectedState.isRegistered,
                    selectedState.nexusType
                  )
                }
                disabled={isUpdating}
                className={`px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedState.isRegistered
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {selectedState.isRegistered ? "Unregister" : "Register with Stripe"}
              </button>
              {STATE_REGISTRATION_URLS[selectedState.stateCode] && (
                <a
                  href={STATE_REGISTRATION_URLS[selectedState.stateCode]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-medium flex items-center gap-2"
                >
                  Register in {selectedState.stateCode}
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* States Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">State</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Threshold</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Sales</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Progress</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.states.map((state) => (
              <tr key={state.stateCode} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getStateColor(state) }}
                    />
                    <span className="font-medium text-white">{state.stateName}</span>
                    {state.isHomeState && (
                      <span className="text-xs text-red-400">(Home)</span>
                    )}
                    {state.nexusType === 'physical' && !state.stripeRegistered && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {formatCurrency(state.threshold)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {formatCurrency(state.relevantSales)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(state.percentageToThreshold, 100)}%`,
                          backgroundColor: getStateColor(state),
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-12">
                      {state.percentageToThreshold.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-zinc-800 text-white rounded text-xs">
                    {state.nexusType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {state.isRegistered ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Registered
                      </span>
                      {state.stripeRegistered && (
                        <span className="text-xs text-gray-500">With Stripe</span>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <XCircle className="w-4 h-4" />
                      Not Registered
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedState(state)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    More Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}