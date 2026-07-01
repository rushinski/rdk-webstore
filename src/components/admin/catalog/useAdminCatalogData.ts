"use client";

import { useCallback, useState } from "react";

import { logError } from "@/lib/utils/log";

import type { Alias, Brand, BrandGroup, Candidate, Model } from "./types";

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
      const [
        groupsResponse,
        brandsResponse,
        modelsResponse,
        aliasesResponse,
        candidatesResponse,
      ] = await Promise.all([
        fetch("/api/admin/catalog/brand-groups?includeInactive=1"),
        fetch("/api/admin/catalog/brands?includeInactive=1"),
        fetch("/api/admin/catalog/models?includeInactive=1"),
        fetch("/api/admin/catalog/aliases?includeInactive=1"),
        fetch("/api/admin/catalog/candidates?status=new"),
      ]);

      const groupsData = await groupsResponse.json();
      const brandsData = await brandsResponse.json();
      const modelsData = await modelsResponse.json();
      const aliasesData = await aliasesResponse.json();
      const candidatesData = await candidatesResponse.json();

      setGroups(groupsData.groups || []);
      setBrands(brandsData.brands || []);
      setModels(modelsData.models || []);
      setAliases(aliasesData.aliases || []);
      setCandidates(candidatesData.candidates || []);
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
