import type { CatalogOption } from "./types";

export interface BrandOverrideState {
  brandOverrideId: string | null;
  brandOverrideInput: string;
  modelOverrideId: string | null;
  modelOverrideInput: string;
}

export interface ModelOverrideState {
  modelOverrideId: string | null;
  modelOverrideInput: string;
}

export function applyBrandOverrideOption(
  option: CatalogOption | null,
): BrandOverrideState {
  return {
    brandOverrideId: option?.id ?? null,
    brandOverrideInput: option?.label ?? "",
    modelOverrideId: null,
    modelOverrideInput: "",
  };
}

export function applyModelOverrideOption(
  option: CatalogOption | null,
): ModelOverrideState {
  return {
    modelOverrideId: option?.id ?? null,
    modelOverrideInput: option?.label ?? "",
  };
}

interface ResolveBrandOverrideChangeArgs {
  value: string;
  brandOptions: CatalogOption[];
}

export function resolveBrandOverrideChange({
  value,
  brandOptions,
}: ResolveBrandOverrideChangeArgs): BrandOverrideState {
  const match = brandOptions.find(
    (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
  );

  if (match) {
    return applyBrandOverrideOption(match);
  }

  return {
    brandOverrideId: null,
    brandOverrideInput: value,
    modelOverrideId: null,
    modelOverrideInput: "",
  };
}

interface ResolveModelOverrideChangeArgs {
  value: string;
  modelOptions: CatalogOption[];
}

export function resolveModelOverrideChange({
  value,
  modelOptions,
}: ResolveModelOverrideChangeArgs): ModelOverrideState {
  const match = modelOptions.find(
    (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
  );

  if (match) {
    return applyModelOverrideOption(match);
  }

  return {
    modelOverrideId: null,
    modelOverrideInput: value,
  };
}

export function applyCatalogSuggestion<T>(
  suggestionId: string | undefined,
  options: CatalogOption[],
  mapOption: (option: CatalogOption) => T,
): T | null {
  if (!suggestionId) {
    return null;
  }

  const match = options.find((option) => option.id === suggestionId);
  return match ? mapOption(match) : null;
}

export function resolveEffectiveBrandId(
  brandOverrideId: string | null,
  parsedBrandId: string | null,
): string | null {
  return brandOverrideId ?? parsedBrandId ?? null;
}
