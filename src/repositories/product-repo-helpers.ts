import type { ProductFilters } from "@/repositories/product-repo";

export function buildOffset(page: number, limit: number) {
  return (page - 1) * limit;
}

export function shouldIncludeOutOfStock(filters: ProductFilters) {
  return Boolean(filters.includeOutOfStock);
}

export function shouldIncludeUnpublished(filters: ProductFilters) {
  return filters.searchMode === "inventory";
}

export function resolveProductSearchFields(
  filters: ProductFilters,
  storefrontSearchFields: string[],
  inventorySearchFields: string[],
) {
  return filters.searchMode === "inventory"
    ? inventorySearchFields
    : storefrontSearchFields;
}
