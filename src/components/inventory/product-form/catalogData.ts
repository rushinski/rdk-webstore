import type { Category } from "@/types/domain/product";

import type { CatalogOption } from "./types";

export interface ShippingDefaultsEntry {
  category: string;
  shipping_cost_cents?: number;
  default_price_cents?: number;
  default_price?: number;
}

export interface BrandCatalogEntry {
  id: string;
  canonical_label: string;
  group?: { key?: string | null } | null;
}

export interface ModelCatalogEntry {
  id: string;
  canonical_label: string;
}

interface BuildTitleParseRequestArgs {
  titleRaw: string;
  category: Category;
  brandOverrideId: string | null;
  modelOverrideId: string | null;
}

export function buildShippingDefaultsMap(
  entries: ShippingDefaultsEntry[],
): Record<string, number> {
  const map: Record<string, number> = {};

  for (const entry of entries) {
    const cents =
      Number(
        entry.shipping_cost_cents ??
          entry.default_price_cents ??
          entry.default_price ??
          0,
      ) || 0;
    map[entry.category] = cents / 100;
  }

  return map;
}

export function mapBrandCatalogOptions(entries: BrandCatalogEntry[]): CatalogOption[] {
  return entries.map((brand) => ({
    id: brand.id,
    label: brand.canonical_label,
    groupKey: brand.group?.key ?? null,
  }));
}

export function mapModelCatalogOptions(entries: ModelCatalogEntry[]): CatalogOption[] {
  return entries.map((model) => ({
    id: model.id,
    label: model.canonical_label,
  }));
}

export function buildTitleParseRequest({
  titleRaw,
  category,
  brandOverrideId,
  modelOverrideId,
}: BuildTitleParseRequestArgs) {
  return {
    titleRaw,
    category,
    brandOverrideId,
    modelOverrideId,
  };
}

export function shouldClearInvalidModelOverride(
  modelOverrideId: string | null,
  modelOptions: CatalogOption[],
): boolean {
  if (!modelOverrideId) {
    return false;
  }

  return !modelOptions.some((option) => option.id === modelOverrideId);
}

export function isAbortLikeError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError";
}
