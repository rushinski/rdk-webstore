"use client";

import { useEffect, useState } from "react";

import {
  loadHomeOfficeStatusRequest,
  loadNexusSummaryRequest,
} from "@/modules/nexus/presentation/admin/nexusTrackerRequests";
import { logError } from "@/lib/utils/log";
import type { NexusData } from "@/types/domain/nexus";

export function useNexusTrackerLoading() {
  const [data, setData] = useState<NexusData | null>(null);
  const [loading, setLoading] = useState(true);
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

  return {
    checkHomeOfficeStatus,
    data,
    fetchNexusData,
    isHomeOfficeConfigured,
    loading,
    setIsHomeOfficeConfigured,
  };
}
