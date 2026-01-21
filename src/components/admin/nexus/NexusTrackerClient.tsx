// src/components/admin/nexus/NexusTrackerClient.tsx (UPDATED)
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Search,
  Download,
  Home,
} from "lucide-react";
import NexusMap from "./NexusMap";
import StateDetailModal from "./StateDetailModal";
import HomeOfficeSetupModal from "./HomeOfficeSetupModal";
import { RdkSelect } from "@/components/ui/Select";
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

  const filterRegisteredOptions = useMemo(
    () => [
      { value: "all", label: "All States" },
      { value: "registered", label: "Registered Only" },
      { value: "unregistered", label: "Unregistered Only" },
    ],
    [],
  );

  const handleDownloadTaxDocs = async () => {
    window.open("https://dashboard.stripe.com/tax/reports", "_blank");
  };

  const getStateColor = (state: StateSummary | undefined) => {
    if (!state) return "#374151";
    if (state.thresholdType === "none" || state.threshold <= 0) return "#374151";

    if (state.isRegistered) return "#22c55e";

    const pct = state.percentageToThreshold;

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
      { label: "50-70%", color: "#facc15" },
      { label: "70-85%", color: "#f59e0b" },
      { label: "85-95%", color: "#f97316" },
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
      
      // Just update the nexus type, don't auto-register
      const res = await fetch("/api/admin/nexus/nexus-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode,
          nexusType: newType,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to update nexus type");
      }

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

  const sortIndicator = (field: keyof StateSummary) =>
    sortField === field ? (sortDirection === "asc" ? "^" : "v") : "";

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
        const needsRegistration = state.nexusType === "physical" && !state.isRegistered;
        const atRisk =
          state.nexusType === "economic" &&
          !state.isRegistered &&
          state.percentageToThreshold >= 85;
        if (!needsRegistration && !atRisk) return false;
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
    (s) =>
      s.nexusType === "economic" &&
      !s.isRegistered &&
      s.percentageToThreshold >= 85,
  ).length;

  const registeredStates = data.states.filter((s) => s.isRegistered).length;

  const needsRegistrationCount = data.states.filter(
    (s) => s.nexusType === "physical" && !s.isRegistered,
  ).length;

  const homeStateLabel = data.homeState; // e.g. "SC"
  const taxEnabled = data.taxEnabled;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Tax Nexus Tracker</h1>
          <p className="text-gray-400">Monitor your sales tax obligations across all US states</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadTaxDocs}
            disabled={!taxEnabled}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-sm text-white",
              taxEnabled
                ? "bg-red-600 hover:bg-red-500"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
            ].join(" ")}
          >
            <Download className="w-4 h-4" />
            View Tax Reports in Stripe
          </button>

          {/* Home state badge next to the home office button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHomeSetup(true)}
              className={`flex items-center gap-2 h-10 px-4 rounded-lg text-white ${
                isHomeOfficeConfigured
                  ? "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <Home className="w-4 h-4" />
              {isHomeOfficeConfigured ? "Change Home Office" : "Setup Home Office"}
            </button>

            {/* Home state pill to the RIGHT of the button */}
            <div
              className="flex items-center gap-2 h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-white shadow-sm"
              title="Registered home state"
            >
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                Home
              </span>
              <span className="text-sm font-bold text-white">{homeStateLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {!taxEnabled && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-sm p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-100">
            Taxes are turned off. Go to{" "}
            <Link
              href="/admin/settings/taxes"
              className="underline underline-offset-2 text-yellow-200 hover:text-yellow-100"
            >
              Settings &gt; Taxes
            </Link>{" "}
            to enable tax collection before using the nexus tracker.
          </div>
        </div>
      )}

      {/* Home Office Setup Modal */}
      {showHomeSetup && (
        <HomeOfficeSetupModal
          onClose={() => setShowHomeSetup(false)}
          onSuccess={() => {
            setShowHomeSetup(false);
            setIsHomeOfficeConfigured(true);
            fetchNexusData();
          }}
          isConfigured={isHomeOfficeConfigured}
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

      {/* US Map */}
      <NexusMap
        states={data.states}
        onStateClick={setSelectedState}
        getStateColor={getStateColor}
        formatCurrency={formatCurrency}
        legendItems={legendItems}
      />

      {/* Stats + Filters UNDER the map */}
      <div className="space-y-4">
        {/* Stats Cards (3 only, per request) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                <p className="text-xs text-gray-400 mb-1">Needs Registration</p>
                <p className="text-2xl font-bold text-white">{needsRegistrationCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
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
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 text-white rounded-sm border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <RdkSelect
              value={filterRegistered}
              onChange={(v) => setFilterRegistered(v as any)}
              options={filterRegisteredOptions}
              className="min-w-[220px]"
            />

            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={filterNeedsAction}
                onChange={(e) => setFilterNeedsAction(e.target.checked)}
                className="rdk-checkbox"
              />
              Needs Action Only
            </label>
          </div>
        </div>
      </div>

      {/* States Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              <th
                className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("stateName")}
              >
                State {sortIndicator("stateName")}
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("threshold")}
              >
                Threshold {sortIndicator("threshold")}
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("relevantSales")}
              >
                Sales {sortIndicator("relevantSales")}
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium text-white cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("percentageToThreshold")}
              >
                Progress {sortIndicator("percentageToThreshold")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white">Actions</th>
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
                    {state.nexusType === "physical" && !state.isRegistered && (
                      <span title="Physical nexus - needs registration" className="inline-flex">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      </span>
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
                      <AlertCircle className="w-4 h-4 text-zinc-500" />
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
  );
}
