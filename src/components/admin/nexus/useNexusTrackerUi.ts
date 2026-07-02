"use client";

import { useMemo, useState } from "react";

import {
  buildFilterRegisteredOptions,
  buildLegendItems,
  buildNexusTypeOptions,
  buildWindowOptions,
  type NexusTrackerFilterValues,
} from "@/components/admin/nexus/nexusTrackerView";
import type { StateSummary } from "@/types/domain/nexus";

export function useNexusTrackerUi() {
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

  const filterRegisteredOptions = useMemo(() => buildFilterRegisteredOptions(), []);
  const nexusTypeOptions = useMemo(() => buildNexusTypeOptions(), []);
  const windowOptions = useMemo(() => buildWindowOptions(), []);
  const legendItems = useMemo(() => buildLegendItems(), []);

  const handleSort = (field: keyof StateSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortField(field);
    setSortDirection(field === "percentageToThreshold" ? "desc" : "asc");
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

  return {
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
    values: {
      filterNeedsAction,
      filterNexusType,
      filterRegistered,
      filterWindow,
    },
    windowOptions,
  };
}
