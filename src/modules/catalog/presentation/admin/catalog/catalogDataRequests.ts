"use client";

import type { Alias, Brand, BrandGroup, Candidate, Model } from "@/modules/catalog/presentation/admin/catalog/types";

type CatalogDataPayload = {
  aliases: Alias[];
  brands: Brand[];
  candidates: Candidate[];
  groups: BrandGroup[];
  models: Model[];
};

type BrandGroupsResponse = { groups?: BrandGroup[] };
type BrandsResponse = { brands?: Brand[] };
type ModelsResponse = { models?: Model[] };
type AliasesResponse = { aliases?: Alias[] };
type CandidatesResponse = { candidates?: Candidate[] };

export async function loadAdminCatalogDataRequest() {
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

  const groupsData = (await groupsResponse.json()) as BrandGroupsResponse;
  const brandsData = (await brandsResponse.json()) as BrandsResponse;
  const modelsData = (await modelsResponse.json()) as ModelsResponse;
  const aliasesData = (await aliasesResponse.json()) as AliasesResponse;
  const candidatesData = (await candidatesResponse.json()) as CandidatesResponse;

  return {
    aliases: aliasesData.aliases || [],
    brands: brandsData.brands || [],
    candidates: candidatesData.candidates || [],
    groups: groupsData.groups || [],
    models: modelsData.models || [],
  } satisfies CatalogDataPayload;
}
