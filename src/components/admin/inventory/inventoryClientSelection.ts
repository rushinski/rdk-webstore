import type { ProductWithDetails } from "@/types/domain/product";

export function getInventorySelectionState({
  products,
  selectedIds,
  selectAllMatching,
  totalCount,
}: {
  products: ProductWithDetails[];
  selectedIds: string[];
  selectAllMatching: boolean;
  totalCount: number;
}) {
  const currentPageIds = products.map((product) => product.id);

  return {
    currentPageIds,
    currentPageAllSelected:
      currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id)),
    selectedCount: selectAllMatching ? totalCount : selectedIds.length,
  };
}

export function toggleInventorySelection(selectedIds: string[], id: string): string[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((existingId) => existingId !== id)
    : [...selectedIds, id];
}

export function toggleInventoryCurrentPageSelection(
  currentPageIds: string[],
  checked: boolean,
): string[] {
  return checked ? currentPageIds : [];
}

export function clearInventorySelection() {
  return {
    selectedIds: [],
    selectAllMatching: false,
  };
}
