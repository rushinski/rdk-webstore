"use client";

import { useNexusTrackerLoading } from "@/components/admin/nexus/useNexusTrackerLoading";
import { useNexusTrackerMutations } from "@/components/admin/nexus/useNexusTrackerMutations";
import type { StateSummary } from "@/types/domain/nexus";

type UseNexusTrackerDataParams = {
  selectedState: StateSummary | null;
  setSelectedState: React.Dispatch<React.SetStateAction<StateSummary | null>>;
  setShowHomeSetup: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useNexusTrackerData({
  selectedState,
  setSelectedState,
  setShowHomeSetup,
}: UseNexusTrackerDataParams) {
  const {
    checkHomeOfficeStatus,
    data,
    fetchNexusData,
    isHomeOfficeConfigured,
    loading,
    setIsHomeOfficeConfigured,
  } = useNexusTrackerLoading();
  const { handleNexusTypeChange, handleRegisterToggle, isUpdating } =
    useNexusTrackerMutations({
      data,
      fetchNexusData,
      isHomeOfficeConfigured,
      selectedState,
      setSelectedState,
      setShowHomeSetup,
    });

  return {
    checkHomeOfficeStatus,
    data,
    fetchNexusData,
    handleNexusTypeChange,
    handleRegisterToggle,
    isHomeOfficeConfigured,
    isUpdating,
    loading,
    setIsHomeOfficeConfigured,
  };
}
