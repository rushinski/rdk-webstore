"use client";

import React, { useMemo } from "react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import HomeOfficeSetupModal from "@/modules/nexus/presentation/admin/HomeOfficeSetupModal";
import NexusMap from "@/modules/nexus/presentation/admin/NexusMap";
import StateDetailModal from "@/modules/nexus/presentation/admin/StateDetailModal";
import { NexusStateCoverageTable } from "@/modules/nexus/presentation/admin/NexusStateCoverageTable";
import { NexusTrackerFilters } from "@/modules/nexus/presentation/admin/NexusTrackerFilters";
import { NexusTrackerHeaderActions } from "@/modules/nexus/presentation/admin/NexusTrackerHeaderActions";
import { NexusTrackerOverviewCards } from "@/modules/nexus/presentation/admin/NexusTrackerOverviewCards";
import { NexusTrackerStatusAlert } from "@/modules/nexus/presentation/admin/NexusTrackerStatusAlert";
import {
  buildFilteredAndSortedStates,
  buildNexusTrackerMetrics,
  formatNexusCurrency,
  getStateColor,
} from "@/modules/nexus/presentation/admin/nexusTrackerView";
import { useNexusTrackerData } from "@/modules/nexus/presentation/admin/useNexusTrackerData";
import { useNexusTrackerUi } from "@/modules/nexus/presentation/admin/useNexusTrackerUi";

export default function NexusTrackerClient() {
  const {
    filterRegisteredOptions,
    handleFilterChange,
    handleSort,
    legendItems,
    nexusTypeOptions,
    searchQuery,
    selectedState,
    setSearchQuery,
    setSelectedState,
    setShowHomeSetup,
    showHomeSetup,
    sortDirection,
    sortField,
    values,
    windowOptions,
  } = useNexusTrackerUi();
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

  const handleDownloadTaxDocs = () => {
    window.open("/admin/settings/taxes", "_self");
  };

  const filteredAndSortedStates = useMemo(() => {
    if (!data) {
      return [];
    }

    return buildFilteredAndSortedStates({
      filterNeedsAction: values.filterNeedsAction,
      filterNexusType: values.filterNexusType,
      filterRegistered: values.filterRegistered,
      filterWindow: values.filterWindow,
      searchQuery,
      sortDirection,
      sortField,
      states: data.states,
    });
  }, [data, searchQuery, sortDirection, sortField, values]);

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
          <NexusTrackerHeaderActions
            homeState={data.homeState}
            isHomeOfficeConfigured={isHomeOfficeConfigured}
            isTaxEnabled={data.taxEnabled}
            onDownloadTaxDocs={handleDownloadTaxDocs}
            onOpenHomeOffice={() => setShowHomeSetup(true)}
          />
        }
      />

      <NexusTrackerStatusAlert taxEnabled={data.taxEnabled} />

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

      <NexusTrackerOverviewCards
        atRiskStates={atRiskStates}
        needsRegistrationCount={needsRegistrationCount}
        registeredStates={registeredStates}
      />

      <NexusTrackerFilters
        filterRegisteredOptions={filterRegisteredOptions}
        nexusTypeOptions={nexusTypeOptions}
        onFilterChange={handleFilterChange}
        onSearchQueryChange={setSearchQuery}
        searchQuery={searchQuery}
        values={values}
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
