// src/components/admin/nexus/NexusTrackerClient.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Search,
  Download,
  Home,
} from "lucide-react";
import {
  STATE_NAMES,
  STATE_REGISTRATION_URLS,
} from "@/config/constants/nexus-thresholds";
import NexusMap from "./NexusMap";
import StateDetailModal from "./StateDetailModal";
import HomeOfficeSetupModal from "./HomeOfficeSetupModal";
import type { NexusData, StateSummary } from "@/types/domain/nexus";

export default function NexusTrackerClient() {
  const [data, setData] = useState<NexusData | null>(null);
  const [selectedState, setSelectedState] = useState<StateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof StateSummary>("percentageToThreshold");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterRegistered, setFilterRegistered] = useState<
    "all" | "registered" | "unregistered"
  >("all");
  const [filterNexusType, setFilterNexusType] = useState<"all" | "physical" | "economic">("all");
  const [filterWindow, setFilterWindow] = useState<"all" | "calendar" | "rolling">("all");
  const [filterNeedsAction, setFilterNeedsAction] = useState(false);
  const [showHomeSetup, setShowHomeSetup] = useState(false);
  const [isHomeOfficeConfigured, setIsHomeOfficeConfigured] = useState(false);

  useEffect(() => {
    fetchNexusData();
    checkHomeOfficeStatus();
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

  const checkHomeOfficeStatus = async () => {
    try {
      const res = await fetch("/api/admin/nexus/home-office-status");
      if (res.ok) {
        const { configured } = await res.json();
        setIsHomeOfficeConfigured(configured);
      }
    } catch (err) {
      console.error("Failed to check home office status:", err);
    }
  };

  const handleDownloadTaxDocs = async () => {
    window.open("https://dashboard.stripe.com/tax/reports", "_blank");
  };

  const getStateColor = (state: StateSummary | undefined) => {
    // Grey for unknown / non-tax states
    if (!state) return "#374151";
    if (state.thresholdType === "none" || state.threshold <= 0) return "#374151";

    // Green: registered (exclusive)
    if (state.isRegistered) return "#22c55e";

    const pct = state.percentageToThreshold;

    // NEW: <50% should be grey (same as old "Not exposed")
    if (pct < 50) return "#374151";

    if (pct < 70) return "#facc15";
    if (pct < 85) return "#f59e0b";
    if (pct < 95) return "#f97316";
    return "#ef4444";
  };

  const legendItems = useMemo(
    () => [
      { label: "Registered", color: "#22c55e" },
      { label: "< 50%", color: "#374151" }, 
      { label: "50–70%", color: "#facc15" },
      { label: "70–85%", color: "#f59e0b" },
      { label: "85–95%", color: "#f97316" },
      { label: "> 95%", color: "#ef4444" },
    ],
    [],
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  const handleRegisterToggle = async (
    stateCode: string,
    currentRegistered: boolean,
    nexusType: "physical" | "economic",
  ) => {
    if (!isHomeOfficeConfigured && !currentRegistered) {
      setShowHomeSetup(true);
      return;
    }

    try {
      setIsUpdating(true);
      const res = await fetch("/api/admin/nexus/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode,
          registrationType: nexusType,
          isRegistered: !currentRegistered,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error && result.error.includes("head office")) {
          setShowHomeSetup(true);
          alert("Please set up your home office address first.");
          return;
        }
        throw new Error(result.error);
      }

      await fetchNexusData();

      if (selectedState?.stateCode === stateCode) {
        const updatedState = data?.states.find((s) => s.stateCode === stateCode);
        if (updatedState) {
          setSelectedState({ ...updatedState, isRegistered: !currentRegistered });
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle registration:", err);
      alert(err.message || "Failed to update registration");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNexusTypeChange = async (
    stateCode: string,
    newType: "physical" | "economic",
  ) => {
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
        const updatedState = data?.states.find((s) => s.stateCode === stateCode);
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

  const handleSort = (field: keyof StateSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "percentageToThreshold" ? "desc" : "asc");
    }
  };

  const filteredAndSortedStates = useMemo(() => {
    if (!data) return [];

    let filtered = data.states.filter((state) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !state.stateName.toLowerCase().includes(query) &&
          !state.stateCode.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (filterRegistered === "registered" && !state.isRegistered) return false;
      if (filterRegistered === "unregistered" && state.isRegistered) return false;

      if (filterNexusType === "physical" && state.nexusType !== "physical") return false;
      if (filterNexusType === "economic" && state.nexusType !== "economic") return false;

      if (filterWindow === "calendar" && state.window !== "calendar") return false;
      if (filterWindow === "rolling" && state.window !== "rolling 12 months") return false;

      if (filterNeedsAction) {
        const needsStripeReg =
          state.nexusType === "physical" && state.isRegistered && !state.stripeRegistered;
        const atRisk = !state.isRegistered && state.percentageToThreshold >= 85;
        if (!needsStripeReg && !atRisk) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return filtered;
  }, [data, searchQuery, sortField, sortDirection, filterRegistered, filterNexusType, filterWindow, filterNeedsAction]);

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
    (s) => !s.isRegistered && s.percentageToThreshold >= 85,
  ).length;

  const registeredStates = data.states.filter((s) => s.isRegistered).length;

  const needsStripeRegistration = data.states.filter(
    (s) => s.nexusType === "physical" && s.isRegistered && !s.stripeRegistered,
  ).length;

  return (
    <div className="p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales Tax Nexus Tracker</h1>
            <p className="text-gray-400">Monitor your sales tax obligations across all US states</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadTaxDocs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <Download className="w-4 h-4" />
              View Tax Reports in Stripe
            </button>

            <button
              onClick={() => setShowHomeSetup(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                isHomeOfficeConfigured ? "bg-zinc-800 hover:bg-zinc-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <Home className="w-4 h-4" />
              {isHomeOfficeConfigured ? "Change Home Office" : "Setup Home Office"}
            </button>
          </div>
        </div>

        {/* Stats Cards - smaller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Registered States</p>
                <p className="text-2xl font-bold text-white">{registeredStates}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">At Risk States</p>
                <p className="text-2xl font-bold text-white">{atRiskStates}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Needs Stripe Setup</p>
                <p className="text-2xl font-bold text-white">{needsStripeRegistration}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Home Office State</p>
                <p className="text-lg font-bold text-white">
                  {STATE_NAMES[data.homeState] ? `${STATE_NAMES[data.homeState]} (${data.homeState})` : data.homeState}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search states..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <select
              value={filterRegistered}
              onChange={(e) => setFilterRegistered(e.target.value as any)}
              className="px-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none"
              title="Filter by registration status"
            >
              <option value="all">All States</option>
              <option value="registered">Registered Only</option>
              <option value="unregistered">Unregistered Only</option>
            </select>

            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={filterNeedsAction}
                onChange={(e) => setFilterNeedsAction(e.target.checked)}
                className="w-4 h-4"
              />
              Needs Action Only
            </label>
          </div>
        </div>

        {/* US Map */}
        <NexusMap
          states={data.states}
          onStateClick={setSelectedState}
          getStateColor={getStateColor}
          formatCurrency={formatCurrency}
          legendItems={legendItems}
        />

        {/* Home Office Setup Modal */}
        {showHomeSetup && (
          <HomeOfficeSetupModal
            onClose={() => setShowHomeSetup(false)}
            onSuccess={() => {
              setShowHomeSetup(false);
              setIsHomeOfficeConfigured(true);
              fetchNexusData();
            }}
          />
        )}

        {/* Modal for State Details */}
        {selectedState && (
          <StateDetailModal
            state={selectedState}
            onClose={() => setSelectedState(null)}
            onRegisterToggle={handleRegisterToggle}
            onNexusTypeChange={handleNexusTypeChange}
            isUpdating={isUpdating}
            formatCurrency={formatCurrency}
            isHomeOfficeConfigured={isHomeOfficeConfigured}
            onOpenHomeOffice={() => setShowHomeSetup(true)}
          />
        )}

        {/* States Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                  onClick={() => handleSort("stateName")}
                >
                  State {sortField === "stateName" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                  onClick={() => handleSort("threshold")}
                >
                  Threshold{" "}
                  {sortField === "threshold" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                  onClick={() => handleSort("relevantSales")}
                >
                  Sales{" "}
                  {sortField === "relevantSales" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                  onClick={() => handleSort("percentageToThreshold")}
                >
                  Progress{" "}
                  {sortField === "percentageToThreshold" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredAndSortedStates.map((state) => (
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
                      {state.nexusType === "physical" && !state.stripeRegistered && (
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
                        <span className="w-4 h-4">○</span>
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

          {filteredAndSortedStates.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No states match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}