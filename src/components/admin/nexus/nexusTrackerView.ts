import type { RdkSelectOption } from "@/components/ui/Select";
import type { StateSummary } from "@/types/domain/nexus";

type NexusTrackerFilters = {
  filterNeedsAction: boolean;
  filterNexusType: "all" | "physical" | "economic";
  filterRegistered: "all" | "registered" | "unregistered";
  filterWindow: "all" | "calendar" | "rolling";
  searchQuery: string;
  sortDirection: "asc" | "desc";
  sortField: keyof StateSummary;
  states: StateSummary[];
};

export function buildFilterRegisteredOptions(): RdkSelectOption[] {
  return [
    { value: "all", label: "All States" },
    { value: "registered", label: "Registered Only" },
    { value: "unregistered", label: "Unregistered Only" },
  ];
}

export function buildNexusTypeOptions(): RdkSelectOption[] {
  return [
    { value: "all", label: "All Nexus Types" },
    { value: "physical", label: "Physical" },
    { value: "economic", label: "Economic" },
  ];
}

export function buildWindowOptions(): RdkSelectOption[] {
  return [
    { value: "all", label: "All Windows" },
    { value: "calendar", label: "Calendar Year" },
    { value: "rolling", label: "Rolling 12 Months" },
  ];
}

export function getStateColor(state: StateSummary | undefined) {
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
}

export function buildLegendItems() {
  return [
    { label: "Registered", color: "#16a34a" },
    { label: "< 50%", color: "#737373" },
    { label: "50-70%", color: "#eab308" },
    { label: "70-85%", color: "#f59e0b" },
    { label: "85-95%", color: "#f97316" },
    { label: "> 95%", color: "#dc2626" },
  ];
}

export function formatNexusCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildFilteredAndSortedStates({
  filterNeedsAction,
  filterNexusType,
  filterRegistered,
  filterWindow,
  searchQuery,
  sortDirection,
  sortField,
  states,
}: NexusTrackerFilters) {
  const filtered = states.filter((state) => {
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

  return filtered.sort((a, b) => {
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
}

export function buildNexusTrackerMetrics(states: StateSummary[]) {
  return {
    atRiskStates: states.filter(
      (state) =>
        state.nexusType === "economic" &&
        !state.isRegistered &&
        state.percentageToThreshold >= 85,
    ).length,
    needsRegistrationCount: states.filter(
      (state) => state.nexusType === "physical" && !state.isRegistered,
    ).length,
    registeredStates: states.filter((state) => state.isRegistered).length,
  };
}

export function getSortIndicator(
  activeSortField: keyof StateSummary,
  activeSortDirection: "asc" | "desc",
  field: keyof StateSummary,
) {
  if (activeSortField !== field) {
    return "";
  }

  return activeSortDirection === "asc" ? "^" : "v";
}
