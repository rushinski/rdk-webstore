"use client";

import { useEffect, useState } from "react";

import {
  loadHomeOfficeStatusRequest,
  loadNexusSummaryRequest,
  updateNexusRegistrationRequest,
  updateNexusTypeRequest,
} from "@/components/admin/nexus/nexusTrackerRequests";
import { logError } from "@/lib/utils/log";
import type { NexusData, StateSummary } from "@/types/domain/nexus";

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
  const [data, setData] = useState<NexusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHomeOfficeConfigured, setIsHomeOfficeConfigured] = useState(false);

  const fetchNexusData = async () => {
    try {
      setLoading(true);
      setData(await loadNexusSummaryRequest());
    } catch (err) {
      logError(err, { layer: "frontend", event: "nexus_fetch_summary_failed" });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const checkHomeOfficeStatus = async () => {
    try {
      const { configured } = await loadHomeOfficeStatusRequest();
      setIsHomeOfficeConfigured(configured);
    } catch (err) {
      logError(err, { layer: "frontend", event: "nexus_home_office_status_failed" });
    }
  };

  useEffect(() => {
    void fetchNexusData();
    void checkHomeOfficeStatus();
  }, []);

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
      try {
        await updateNexusRegistrationRequest({
          stateCode,
          nexusType,
          isRegistered: !currentRegistered,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update registration";
        if (message.includes("head office")) {
          setShowHomeSetup(true);
          alert("Please set up your home office address first.");
          return;
        }
        throw error;
      }

      await fetchNexusData();

      if (selectedState?.stateCode === stateCode) {
        const updatedState = data?.states.find((s) => s.stateCode === stateCode);
        if (updatedState) {
          setSelectedState({ ...updatedState, isRegistered: !currentRegistered });
        }
      }
    } catch (err: unknown) {
      logError(err, { layer: "frontend", event: "nexus_toggle_registration_failed" });
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
      await updateNexusTypeRequest({
        stateCode,
        nexusType: newType,
      });

      await fetchNexusData();

      if (selectedState?.stateCode === stateCode) {
        const updatedState = data?.states.find((s) => s.stateCode === stateCode);
        if (updatedState) {
          setSelectedState({ ...updatedState, nexusType: newType });
        }
      }
    } catch (err) {
      logError(err, { layer: "frontend", event: "nexus_type_change_failed" });
    } finally {
      setIsUpdating(false);
    }
  };

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
