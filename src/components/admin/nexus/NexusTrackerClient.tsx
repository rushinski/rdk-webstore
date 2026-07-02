"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, Home } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { NexusStateCoverageTable } from "@/components/admin/nexus/NexusStateCoverageTable";
import { NexusTrackerFilters } from "@/components/admin/nexus/NexusTrackerFilters";
import {
  buildFilterRegisteredOptions,
  buildFilteredAndSortedStates,
  buildLegendItems,
  buildNexusTrackerMetrics,
  buildNexusTypeOptions,
  type NexusTrackerFilterValues,
  buildWindowOptions,
  formatNexusCurrency,
  getStateColor,
} from "@/components/admin/nexus/nexusTrackerView";
import { useNexusTrackerData } from "@/components/admin/nexus/useNexusTrackerData";
import type { StateSummary } from "@/types/domain/nexus";

import HomeOfficeSetupModal from "./HomeOfficeSetupModal";
import NexusMap from "./NexusMap";
import StateDetailModal from "./StateDetailModal";

export default function NexusTrackerClient() {
  const [selectedState, setSelectedState] = useState<StateSummary | null>(null);
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
  const {
    data,
    fetchNexusData,
    handleNexusTypeChange,
    handleRegisterToggle,
    isHomeOfficeConfigured,
    isUpdating,
    loading,
    setIsHomeOfficeConfigured,
  } = useNexusTrackerData({
    selectedState,
    setSelectedState,
    setShowHomeSetup,
  });

  const filterRegisteredOptions = useMemo(() => buildFilterRegisteredOptions(), []);
  const nexusTypeOptions = useMemo(() => buildNexusTypeOptions(), []);
  const windowOptions = useMemo(() => buildWindowOptions(), []);

  const handleDownloadTaxDocs = () => {
    window.open("/admin/settings/taxes", "_self");
  };

  const legendItems = useMemo(() => buildLegendItems(), []);

  const handleSort = (field: keyof StateSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "percentageToThreshold" ? "desc" : "asc");
    }
  };

  const handleFilterChange = <K extends keyof NexusTrackerFilterValues>(
    key: K,
    value: NexusTrackerFilterValues[K],
  ) => {
    switch (key) {
      case "filterNeedsAction":
        setFilterNeedsAction(value as boolean);
        break;
      case "filterNexusType":
        setFilterNexusType(value as NexusTrackerFilterValues["filterNexusType"]);
        break;
      case "filterRegistered":
        setFilterRegistered(value as NexusTrackerFilterValues["filterRegistered"]);
        break;
      case "filterWindow":
        setFilterWindow(value as NexusTrackerFilterValues["filterWindow"]);
        break;
    }
  };

  const filteredAndSortedStates = useMemo(() => {
    if (!data) {
      return [];
    }

    return buildFilteredAndSortedStates({
      filterNeedsAction,
      filterNexusType,
      filterRegistered,
      filterWindow,
      searchQuery,
      sortDirection,
      sortField,
      states: data.states,
    });
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

  const { atRiskStates, needsRegistrationCount, registeredStates } =
    buildNexusTrackerMetrics(data.states);

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
          formatCurrency={formatNexusCurrency}
          isHomeOfficeConfigured={isHomeOfficeConfigured}
          onOpenHomeOffice={() => setShowHomeSetup(true)}
        />
      )}

      <NexusMap
        states={data.states}
        onStateClick={setSelectedState}
        getStateColor={getStateColor}
        formatCurrency={formatNexusCurrency}
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

      <NexusTrackerFilters
        filterRegisteredOptions={filterRegisteredOptions}
        nexusTypeOptions={nexusTypeOptions}
        onFilterChange={handleFilterChange}
        onSearchQueryChange={setSearchQuery}
        searchQuery={searchQuery}
        values={{
          filterNeedsAction,
          filterNexusType,
          filterRegistered,
          filterWindow,
        }}
        windowOptions={windowOptions}
      />

      <NexusStateCoverageTable
        formatCurrency={formatNexusCurrency}
        onSelectState={setSelectedState}
        onSort={handleSort}
        sortDirection={sortDirection}
        sortField={sortField}
        states={filteredAndSortedStates}
      />
    </div>
  );
}
