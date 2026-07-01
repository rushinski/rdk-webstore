"use client";

import { useMemo } from "react";

import type { Alias, Brand, BrandGroup, Candidate, Model } from "./types";

type UseAdminCatalogDerivedStateParams = {
  groups: BrandGroup[];
  brands: Brand[];
  models: Model[];
  aliases: Alias[];
  candidates: Candidate[];
  query: string;
  showInactive: boolean;
  showUnverified: boolean;
};

export function useAdminCatalogDerivedState({
  groups,
  brands,
  models,
  aliases,
  candidates,
  query,
  showInactive,
  showUnverified,
}: UseAdminCatalogDerivedStateParams) {
  const normalizedQuery = query.trim().toLowerCase();

  const brandMap = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands],
  );
  const modelMap = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );

  const matchesQuery = (value: string) =>
    normalizedQuery.length === 0 || value.toLowerCase().includes(normalizedQuery);

  const defaultGroupId = useMemo(() => {
    if (groups.length === 0) {
      return null;
    }

    const activeGroups = groups.filter((group) => group.is_active);
    const preferred =
      activeGroups.find((group) => group.key === "other") ?? activeGroups[0];

    return preferred?.id ?? groups[0]?.id ?? null;
  }, [groups]);

  const filteredModels = useMemo(
    () =>
      models.filter((model) => {
        if (!showInactive && !model.is_active) {
          return false;
        }
        if (!showUnverified && !model.is_verified) {
          return false;
        }

        const brandLabel = brandMap.get(model.brand_id)?.canonical_label ?? "";

        return matchesQuery(model.canonical_label) || matchesQuery(brandLabel);
      }),
    [models, showInactive, showUnverified, normalizedQuery, brandMap],
  );

  const filteredModelsByBrandId = useMemo(() => {
    const map: Record<string, Model[]> = {};

    filteredModels.forEach((model) => {
      if (!map[model.brand_id]) {
        map[model.brand_id] = [];
      }

      map[model.brand_id].push(model);
    });

    Object.keys(map).forEach((brandId) => {
      map[brandId].sort((left, right) =>
        left.canonical_label.localeCompare(right.canonical_label),
      );
    });

    return map;
  }, [filteredModels]);

  const filteredBrands = useMemo(
    () =>
      brands.filter((brand) => {
        if (!showInactive && !brand.is_active) {
          return false;
        }
        if (!showUnverified && !brand.is_verified) {
          return false;
        }

        const matchesBrand = matchesQuery(brand.canonical_label);
        const matchesModel = (filteredModelsByBrandId[brand.id]?.length ?? 0) > 0;

        return matchesBrand || matchesModel;
      }),
    [brands, showInactive, showUnverified, normalizedQuery, filteredModelsByBrandId],
  );

  const filteredAliases = useMemo(
    () =>
      aliases.filter((alias) => {
        if (!showInactive && !alias.is_active) {
          return false;
        }

        const targetLabel =
          alias.entity_type === "brand"
            ? (brandMap.get(alias.brand_id ?? "")?.canonical_label ?? "")
            : (modelMap.get(alias.model_id ?? "")?.canonical_label ?? "");

        return matchesQuery(alias.alias_label) || matchesQuery(targetLabel);
      }),
    [aliases, showInactive, normalizedQuery, brandMap, modelMap],
  );

  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const brandLabel =
          brandMap.get(candidate.parent_brand_id ?? "")?.canonical_label ?? "";

        return matchesQuery(candidate.raw_text) || matchesQuery(brandLabel);
      }),
    [candidates, normalizedQuery, brandMap],
  );

  const resolveBrandLabel = (brandId?: string | null) =>
    brandMap.get(brandId ?? "")?.canonical_label || "Unknown";

  const resolveModelLabel = (modelId?: string | null) =>
    modelMap.get(modelId ?? "")?.canonical_label || "Unknown";

  const counts = {
    brands: filteredBrands.length,
    aliases: filteredAliases.length,
    candidates: filteredCandidates.length,
  };

  return {
    counts,
    defaultGroupId,
    filteredAliases,
    filteredBrands,
    filteredCandidates,
    filteredModelsByBrandId,
    resolveBrandLabel,
    resolveModelLabel,
  };
}
