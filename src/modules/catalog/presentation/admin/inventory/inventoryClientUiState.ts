import type { ProductWithDetails, ProductVariantRow } from "@/types/domain/product";

export function createInventoryDetailsSelection(
  product: ProductWithDetails,
  variant: ProductVariantRow,
) {
  return { product, variant };
}

export function toggleInventoryExpandedVariantState(
  expandedVariants: Record<string, boolean>,
  productId: string,
): Record<string, boolean> {
  return {
    ...expandedVariants,
    [productId]: !expandedVariants[productId],
  };
}

export function toggleInventoryOpenMenuId(
  currentOpenMenuId: string | null,
  productId: string,
): string | null {
  return currentOpenMenuId === productId ? null : productId;
}

export function filterInventorySelectionAfterRestore(
  selectedIds: string[],
  productId: string,
): string[] {
  return selectedIds.filter((id) => id !== productId);
}
