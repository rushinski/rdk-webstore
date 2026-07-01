import type { ProductWithDetails } from "@/types/domain/product";
import type { StockStatus } from "@/components/admin/inventory/inventoryClientData";

export function createInventoryDeleteRequest(product: ProductWithDetails, label: string) {
  return {
    id: product.id,
    label,
  };
}

export function createInventoryArchiveRequest({
  product,
  label,
  count,
}: {
  product?: ProductWithDetails;
  label?: string;
  count?: number;
}) {
  if (product) {
    return {
      mode: "single" as const,
      id: product.id,
      label: label ?? "this product",
    };
  }

  return {
    mode: "selected" as const,
    count,
  };
}

export function createInventoryRestoreRequest(count: number) {
  return {
    mode: "selected" as const,
    count,
  };
}

export function canDeleteInventorySelection(selectedCount: number): boolean {
  return selectedCount > 0;
}

export function canRestoreInventorySelection(
  selectedCount: number,
  stockStatus: StockStatus,
): boolean {
  return selectedCount > 0 && stockStatus === "archived";
}

export function canArchiveInventorySelection(
  selectedCount: number,
  stockStatus: StockStatus,
): boolean {
  return selectedCount > 0 && stockStatus !== "archived";
}

export function canEnableSelectAllMatching(selectedIdsCount: number): boolean {
  return selectedIdsCount > 0;
}
