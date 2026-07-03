import type { ProductFilters } from "@/repositories/product-repo";

export function normalizeArchiveFilters(filters: ProductFilters): ProductFilters {
  if (filters.stockStatus !== "archived") {
    return filters;
  }

  return {
    ...filters,
    stockStatus: "all",
    archivedStatus: "archived",
  };
}

export function normalizeVariantSortOrder<
  T extends {
    sort_order?: number | null;
  },
>(variants: T[]): T[] {
  return variants.map((variant, index) => ({
    ...variant,
    sort_order: Number.isFinite(variant.sort_order) ? variant.sort_order : index,
  })) as T[];
}

export function assertNoDuplicateVariantSizes<
  T extends {
    size_label: string;
  },
>(variants: T[]) {
  const seen = new Set<string>();

  for (const variant of variants) {
    const normalizedSizeLabel = variant.size_label.trim().toLowerCase();

    if (seen.has(normalizedSizeLabel)) {
      throw new Error(`Duplicate size "${variant.size_label}" found in variants.`);
    }

    seen.add(normalizedSizeLabel);
  }
}

export function normalizeGoLiveAt(goLiveAt?: string): string {
  if (!goLiveAt?.trim()) {
    return new Date().toISOString();
  }

  const parsed = new Date(goLiveAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid go-live date/time.");
  }

  return parsed.toISOString();
}
