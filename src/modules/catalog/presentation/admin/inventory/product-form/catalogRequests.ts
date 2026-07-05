import type { Category } from "@/types/domain/product";

import {
  buildShippingDefaultsMap,
  buildTitleParseRequest,
  mapBrandCatalogOptions,
  mapModelCatalogOptions,
} from "./catalogData";

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

interface TitleParseRequestInput {
  titleRaw: string;
  category: Category;
  brandOverrideId: string | null;
  modelOverrideId: string | null;
}

export interface TitleParseResponse {
  titleRaw: string;
  titleDisplay: string;
  name: string;
  brand: {
    id: string | null;
    label: string;
    groupKey?: string | null;
    isVerified: boolean;
  };
  model: {
    id: string | null;
    label: string | null;
    isVerified: boolean;
  };
  suggestions?: {
    brand?: { id: string; label: string; confidence: number };
    model?: { id: string; label: string; confidence: number };
  };
}

interface ShippingDefaultsResponse {
  defaults?: Array<{
    category: string;
    shipping_cost_cents?: number;
    default_price_cents?: number;
    default_price?: number;
  }>;
}

interface BrandCatalogResponse {
  brands?: Array<{
    id: string;
    canonical_label: string;
    group?: { key?: string | null } | null;
  }>;
}

interface ModelCatalogResponse {
  models?: Array<{
    id: string;
    canonical_label: string;
  }>;
}

interface ParseErrorResponse {
  error?: string;
}

export async function fetchShippingDefaults(fetcher: FetchLike): Promise<{
  shippingDefaults: Record<string, number> | null;
  status: "ready" | "error";
}> {
  const response = await fetcher("/api/admin/shipping/defaults");
  const data = (await response.json()) as ShippingDefaultsResponse;

  if (!response.ok || !data?.defaults) {
    return {
      shippingDefaults: null,
      status: "error",
    };
  }

  return {
    shippingDefaults: buildShippingDefaultsMap(data.defaults),
    status: "ready",
  };
}

export async function fetchBrandCatalogOptions(fetcher: FetchLike) {
  const response = await fetcher("/api/admin/catalog/brands");
  const data = (await response.json()) as BrandCatalogResponse;

  if (!response.ok) {
    return [];
  }

  return mapBrandCatalogOptions(data.brands || []);
}

export async function fetchModelCatalogOptions(fetcher: FetchLike, brandId: string) {
  const response = await fetcher(`/api/admin/catalog/models?brandId=${brandId}`);
  const data = (await response.json()) as ModelCatalogResponse;

  if (!response.ok) {
    return [];
  }

  return mapModelCatalogOptions(data.models || []);
}

export async function requestTitleParse(
  input: TitleParseRequestInput,
  fetcher: FetchLike,
  signal: AbortSignal,
): Promise<TitleParseResponse> {
  const response = await fetcher("/api/admin/catalog/parse-title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTitleParseRequest(input)),
    signal,
  });
  const data = (await response.json()) as TitleParseResponse & ParseErrorResponse;

  if (!response.ok) {
    throw new Error(data?.error || "Failed to parse title.");
  }

  return data as TitleParseResponse;
}
