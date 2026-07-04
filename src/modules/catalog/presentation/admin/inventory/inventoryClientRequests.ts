import type { ProductWithDetails } from "@/types/domain/product";
import {
  buildInventoryExportSearchParams,
  buildInventoryFetchSearchParams,
  type InventoryFilters,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientData";

export function buildInventoryProductsUrl({
  pageSize,
  filters,
}: {
  pageSize: number;
  filters: InventoryFilters;
}): string {
  return `/api/admin/products?${buildInventoryFetchSearchParams({
    pageSize,
    filters,
  }).toString()}`;
}

export function buildInventoryExportUrl(filters: Omit<InventoryFilters, "page">): string {
  return `/api/admin/products/export?${buildInventoryExportSearchParams(filters).toString()}`;
}

export function normalizeInventoryProductsResponse(data: {
  products?: ProductWithDetails[];
  total?: number | string;
  skuTotal?: number | string;
  inventoryUnitTotal?: number | string;
}) {
  const products = data.products || [];
  const totalCount = Number(data.total ?? 0);

  return {
    products,
    totalCount,
    skuTotalCount: Number(data.skuTotal ?? data.total ?? 0),
    inventoryUnitTotalCount: Number(data.inventoryUnitTotal ?? 0),
  };
}
