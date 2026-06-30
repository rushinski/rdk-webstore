"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Download, Home, Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { RdkSelect } from "@/components/ui/Select";
import type { NexusData, StateSummary } from "@/types/domain/nexus";

import HomeOfficeSetupModal from "./HomeOfficeSetupModal";
import NexusMap from "./NexusMap";
import StateDetailModal from "./StateDetailModal";

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
  const [filterNexusType, setFilterNexusType] = useState<"all" | "physical" | "economic">(
    "all",
  );
  const [filterWindow, setFilterWindow] = useState<"all" | "calendar" | "rolling">("all");
  const [filterNeedsAction, setFilterNeedsAction] = useState(false);
  const [showHomeSetup, setShowHomeSetup] = useState(false);
  const [isHomeOfficeConfigured, setIsHomeOfficeConfigured] = useState(false);

  useEffect(() => {
    void fetchNexusData();
    void checkHomeOfficeStatus();
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

  const nexusTypeOptions = useMemo(
    () => [
      { value: "all", label: "All Nexus Types" },
      { value: "physical", label: "Physical" },
      { value: "economic", label: "Economic" },
    ],
    [],
  );

  const windowOptions = useMemo(
    () => [
      { value: "all", label: "All Windows" },
      { value: "calendar", label: "Calendar Year" },
      { value: "rolling", label: "Rolling 12 Months" },
    ],
    [],
  );

  const handleDownloadTaxDocs = () => {
    window.open("/admin/settings/taxes", "_self");
  };

  const getStateColor = (state: StateSummary | undefined) => {
    if (!state) {
      return "#737373";
    }
    if (state.thresholdType === "none" || state.threshold <= 0) {
      return "#737373";
    }
    if (state.isRegistered) {
      return "#16a34a";
    }

    const pct = state.percentageToThreshold;
    if (pct < 50) {
      return "#737373";
    }
    if (pct < 70) {
      return "#eab308";
    }
    if (pct < 85) {
      return "#f59e0b";
    }
    if (pct < 95) {
      return "#f97316";
    }
    return "#dc2626";
  };

  const legendItems = useMemo(
    () => [
      { label: "Registered", color: "#16a34a" },
      { label: "< 50%", color: "#737373" },
      { label: "50-70%", color: "#eab308" },
      { label: "70-85%", color: "#f59e0b" },
      { label: "85-95%", color: "#f97316" },
      { label: "> 95%", color: "#dc2626" },
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
    } catch (err: unknown) {
      console.error("Failed to toggle registration:", err);
      const message =
        err instanceof Error ? err.message : "Failed to update registration";
      alert(message);
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
    if (!data) {
      return [];
    }

    const filtered = data.states.filter((state) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !state.stateName.toLowerCase().includes(query) &&
          !state.stateCode.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (filterRegistered === "registered" && !state.isRegistered) {
        return false;
      }
      if (filterRegistered === "unregistered" && state.isRegistered) {
        return false;
      }
      if (filterNexusType === "physical" && state.nexusType !== "physical") {
        return false;
      }
      if (filterNexusType === "economic" && state.nexusType !== "economic") {
        return false;
      }
      if (filterWindow === "calendar" && state.window !== "calendar") {
        return false;
      }
      if (filterWindow === "rolling" && state.window !== "rolling 12 months") {
        return false;
      }
      if (filterNeedsAction) {
        const needsRegistration = state.nexusType === "physical" && !state.isRegistered;
        const atRisk =
          state.nexusType === "economic" &&
          !state.isRegistered &&
          state.percentageToThreshold >= 85;
        if (!needsRegistration && !atRisk) {
          return false;
        }
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
  }, [
    data,
    filterNeedsAction,
    filterNexusType,
    filterRegistered,
    filterWindow,
    searchQuery,
    sortDirection,
    sortField,
  ]);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Tax & Nexus"
          description="Monitor your tax footprint across states."
        />
        <AdminSectionCard>
          <div className="text-sm text-brand-muted">Loading nexus data...</div>
        </AdminSectionCard>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Tax & Nexus"
          description="Monitor your tax footprint across states."
        />
        <AdminEmptyState
          title="Failed To Load Nexus Data"
          description="Refresh the page and try again."
        />
      </div>
    );
  }

  const atRiskStates = data.states.filter(
    (state) =>
      state.nexusType === "economic" &&
      !state.isRegistered &&
      state.percentageToThreshold >= 85,
  ).length;
  const registeredStates = data.states.filter((state) => state.isRegistered).length;
  const needsRegistrationCount = data.states.filter(
    (state) => state.nexusType === "physical" && !state.isRegistered,
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tax & Nexus"
        description="Monitor your sales tax obligations across all US states."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadTaxDocs}
              disabled={!data.taxEnabled}
              className={[
                adminButtonStyles.secondary,
                "gap-2",
                !data.taxEnabled ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
            >
              <Download className="h-4 w-4" />
              View Tax Reports
            </button>

            <button
              onClick={() => setShowHomeSetup(true)}
              className={[
                isHomeOfficeConfigured
                  ? adminButtonStyles.secondary
                  : adminButtonStyles.primary,
                "gap-2",
              ].join(" ")}
            >
              <Home className="h-4 w-4" />
              {isHomeOfficeConfigured ? "Change Home Office" : "Setup Home Office"}
            </button>

            <div className="flex h-10 items-center gap-2 border border-brand-border bg-brand-page px-3 text-brand-text">
              <span className="text-[10px] uppercase tracking-wide text-brand-muted">
                Home
              </span>
              <span className="text-sm font-bold">{data.homeState}</span>
            </div>
          </div>
        }
      />

      {!data.taxEnabled && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div className="text-sm">
            Taxes are turned off. Go to{" "}
            <Link
              href="/admin/settings/taxes"
              className="underline underline-offset-2 text-amber-900 hover:text-amber-700"
            >
              Settings &gt; Taxes
            </Link>{" "}
            to enable tax collection before using the nexus tracker.
          </div>
        </div>
      )}

      {showHomeSetup && (
        <HomeOfficeSetupModal
          onClose={() => setShowHomeSetup(false)}
          onSuccess={() => {
            setShowHomeSetup(false);
            setIsHomeOfficeConfigured(true);
            void fetchNexusData();
          }}
          isConfigured={isHomeOfficeConfigured}
        />
      )}

      {selectedState && (
        <StateDetailModal
          state={selectedState}
          onClose={() => setSelectedState(null)}
          onRegisterToggle={(stateCode, currentRegistered, nexusType) => {
            void handleRegisterToggle(stateCode, currentRegistered, nexusType);
          }}
          onNexusTypeChange={(stateCode, newType) => {
            void handleNexusTypeChange(stateCode, newType);
          }}
          isUpdating={isUpdating}
          formatCurrency={formatCurrency}
          isHomeOfficeConfigured={isHomeOfficeConfigured}
          onOpenHomeOffice={() => setShowHomeSetup(true)}
        />
      )}

      <NexusMap
        states={data.states}
        onStateClick={setSelectedState}
        getStateColor={getStateColor}
        formatCurrency={formatCurrency}
        legendItems={legendItems}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <AdminMetricCard
          label="Registered States"
          value={String(registeredStates)}
          detail="States with permits on file."
        />
        <AdminMetricCard
          label="At Risk States"
          value={String(atRiskStates)}
          detail="Economic nexus nearing or over threshold."
        />
        <AdminMetricCard
          label="Needs Registration"
          value={String(needsRegistrationCount)}
          detail="Physical nexus states still pending."
        />
      </div>

      <AdminSectionCard title="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[160px] flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                placeholder="Search states..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${adminFormStyles.input} h-9 pl-8 pr-2.5 py-1 text-[11px] sm:text-sm`}
              />
            </div>
          </div>

          <RdkSelect
            value={filterRegistered}
            onChange={(value) =>
              setFilterRegistered(value as "all" | "registered" | "unregistered")
            }
            options={filterRegisteredOptions}
            className="min-w-[160px]"
            buttonClassName="h-8 py-1 text-[11px] sm:text-sm"
            menuClassName="text-[11px] sm:text-sm"
          />

          <RdkSelect
            value={filterNexusType}
            onChange={(value) =>
              setFilterNexusType(value as "all" | "physical" | "economic")
            }
            options={nexusTypeOptions}
            className="min-w-[160px]"
            buttonClassName="h-8 py-1 text-[11px] sm:text-sm"
            menuClassName="text-[11px] sm:text-sm"
          />

          <RdkSelect
            value={filterWindow}
            onChange={(value) => setFilterWindow(value as "all" | "calendar" | "rolling")}
            options={windowOptions}
            className="min-w-[160px]"
            buttonClassName="h-8 py-1 text-[11px] sm:text-sm"
            menuClassName="text-[11px] sm:text-sm"
          />

          <label className="flex items-center gap-1.5 text-[11px] leading-none sm:text-sm">
            <input
              type="checkbox"
              checked={filterNeedsAction}
              onChange={(e) => setFilterNeedsAction(e.target.checked)}
              className="rdk-checkbox scale-90"
            />
            <span className="text-brand-text">Needs Action Only</span>
          </label>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="State Coverage">
        <div className="overflow-hidden border border-brand-border">
          <table className="w-full text-[12px] sm:text-sm">
            <thead className="bg-brand-page">
              <tr>
                <th
                  className="cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30"
                  onClick={() => handleSort("stateName")}
                >
                  State {sortIndicator("stateName")}
                </th>
                <th
                  className="hidden cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30 md:table-cell"
                  onClick={() => handleSort("threshold")}
                >
                  Threshold {sortIndicator("threshold")}
                </th>
                <th
                  className="hidden cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30 md:table-cell"
                  onClick={() => handleSort("relevantSales")}
                >
                  Sales {sortIndicator("relevantSales")}
                </th>
                <th
                  className="hidden cursor-pointer px-3 py-3 text-left font-medium text-brand-text hover:bg-brand-border/30 md:table-cell"
                  onClick={() => handleSort("percentageToThreshold")}
                >
                  Progress {sortIndicator("percentageToThreshold")}
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
              {filteredAndSortedStates.map((state) => (
                <tr key={state.stateCode} className="hover:bg-brand-page">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: getStateColor(state) }}
                      />
                      <span className="font-medium text-brand-text">
                        {state.stateName}
                      </span>
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
                      onClick={() => setSelectedState(state)}
                      className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-text underline-offset-2 hover:underline sm:text-sm"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedStates.length === 0 && (
            <div className="p-8">
              <AdminEmptyState
                title="No Matching States"
                description="Adjust your filters to expand the result set."
              />
            </div>
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
}
