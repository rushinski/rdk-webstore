"use client";

import { useState } from "react";

import { updateNexusRegistrationRequest, updateNexusTypeRequest } from "@/components/admin/nexus/nexusTrackerRequests";
import { logError } from "@/lib/utils/log";
import type { NexusData, StateSummary } from "@/types/domain/nexus";

type UseNexusTrackerMutationsArgs = {
  data: NexusData | null;
  fetchNexusData: () => Promise<void>;
  isHomeOfficeConfigured: boolean;
  selectedState: StateSummary | null;
  setSelectedState: React.Dispatch<React.SetStateAction<StateSummary | null>>;
  setShowHomeSetup: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useNexusTrackerMutations({
  data,
  fetchNexusData,
  isHomeOfficeConfigured,
  selectedState,
  setSelectedState,
  setShowHomeSetup,
}: UseNexusTrackerMutationsArgs) {
  const [isUpdating, setIsUpdating] = useState(false);

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
    handleNexusTypeChange,
    handleRegisterToggle,
    isUpdating,
  };
}
