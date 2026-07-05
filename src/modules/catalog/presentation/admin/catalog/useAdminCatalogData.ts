"use client";

import { useCallback, useState } from "react";

import { logError } from "@/lib/utils/log";
import { loadAdminCatalogDataRequest } from "@/modules/catalog/presentation/admin/catalog/catalogDataRequests";

import type {
  Alias,
  Brand,
  BrandGroup,
  Candidate,
  Model,
} from "@/modules/catalog/presentation/admin/catalog/types";

export function useAdminCatalogData() {
  const [groups, setGroups] = useState<BrandGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const data = await loadAdminCatalogDataRequest();
      setGroups(data.groups);
      setBrands(data.brands);
      setModels(data.models);
      setAliases(data.aliases);
      setCandidates(data.candidates);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_catalog" });
      setMessage("Failed to load tag data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    aliases,
    brands,
    candidates,
    groups,
    isLoading,
    loadAll,
    message,
    models,
    setAliases,
    setBrands,
    setCandidates,
    setGroups,
    setIsLoading,
    setMessage,
    setModels,
  };
}
