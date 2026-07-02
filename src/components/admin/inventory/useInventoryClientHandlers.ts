"use client";

import type { Dispatch, SetStateAction } from "react";

import {
  createInventoryDetailsSelection,
  toggleInventoryExpandedVariantState,
  toggleInventoryOpenMenuId,
} from "@/components/admin/inventory/inventoryClientUiState";
import {
  getProductLiveState as deriveProductLiveState,
  getProductRawTitle,
  getProductTotalStock,
  getPrimaryImageUrl,
} from "@/components/admin/inventory/inventoryClientData";
import {
  toggleInventoryCurrentPageSelection,
  toggleInventorySelection,
} from "@/components/admin/inventory/inventoryClientSelection";
import type { ProductVariantRow, ProductWithDetails } from "@/types/domain/product";

type UseInventoryClientHandlersArgs = {
  currentPageIds: string[];
  setDetailsSelection: Dispatch<
    SetStateAction<{
      product: ProductWithDetails;
      variant: ProductVariantRow;
    } | null>
  >;
  setExpandedVariants: Dispatch<SetStateAction<Record<string, boolean>>>;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
  setSelectAllMatching: Dispatch<SetStateAction<boolean>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export function useInventoryClientHandlers({
  currentPageIds,
  setDetailsSelection,
  setExpandedVariants,
  setOpenMenuId,
  setSelectAllMatching,
  setSelectedIds,
}: UseInventoryClientHandlersArgs) {
  const getProductLiveState = (product: ProductWithDetails) =>
    deriveProductLiveState(product);

  const toggleVariants = (productId: string) => {
    setExpandedVariants((prev) => toggleInventoryExpandedVariantState(prev, productId));
  };

  const openDetailsModal = (product: ProductWithDetails, variant: ProductVariantRow) => {
    setDetailsSelection(createInventoryDetailsSelection(product, variant));
  };

  const toggleSelection = (id: string) => {
    setSelectAllMatching(false);
    setSelectedIds((prev) => toggleInventorySelection(prev, id));
  };

  const toggleSelectCurrentPage = (checked: boolean) => {
    setSelectAllMatching(false);
    setSelectedIds(toggleInventoryCurrentPageSelection(currentPageIds, checked));
  };

  const toggleMenu = (productId: string) => {
    setOpenMenuId((prev) => toggleInventoryOpenMenuId(prev, productId));
  };

  return {
    getPrimaryImageUrl,
    getProductLiveState,
    getProductRawTitle,
    getProductTotalStock,
    openDetailsModal,
    toggleMenu,
    toggleSelectCurrentPage,
    toggleSelection,
    toggleVariants,
  };
}
