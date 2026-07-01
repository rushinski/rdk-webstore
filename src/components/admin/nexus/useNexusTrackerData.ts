"use client";

import { useEffect, useState } from "react";

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
