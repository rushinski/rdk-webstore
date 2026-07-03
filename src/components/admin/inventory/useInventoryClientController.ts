"use client";

import {
  buildInventoryContentProps,
  buildInventoryDialogsProps,
  buildInventoryPaginationProps,
  buildInventoryToolbarProps,
} from "@/components/admin/inventory/inventoryClientSurface";
import {
  getProductRawTitle,
  type InventoryFilters,
} from "@/components/admin/inventory/inventoryClientData";
import { getInventorySelectionState } from "@/components/admin/inventory/inventoryClientSelection";
import { getInventoryHeaderDescription } from "@/components/admin/inventory/inventoryClientView";
import { getInventoryDerivedState } from "@/components/admin/inventory/inventoryClientDerivedState";
import { useInventoryClientData } from "@/components/admin/inventory/useInventoryClientData";
import { useInventoryClientEffects } from "@/components/admin/inventory/useInventoryClientEffects";
import { useInventoryClientHandlers } from "@/components/admin/inventory/useInventoryClientHandlers";
import { useInventoryClientMutations } from "@/components/admin/inventory/useInventoryClientMutations";
import { useInventoryClientState } from "@/components/admin/inventory/useInventoryClientState";
import type { ProductWithDetails } from "@/types/domain/product";

const PAGE_SIZE = 100;

type UseInventoryClientControllerArgs = {
  initialProducts: ProductWithDetails[];
  initialTotal: number;
  initialSkuTotal: number;
  initialInventoryUnitTotal: number;
  initialFilters: InventoryFilters;
};

export function useInventoryClientController({
  initialProducts,
  initialTotal,
  initialSkuTotal,
  initialInventoryUnitTotal,
  initialFilters,
}: UseInventoryClientControllerArgs) {
  const {
    categoryFilter,
    conditionFilter,
    detailsSelection,
    expandedVariants,
    filtersRef,
    inventoryUnitTotalCount,
    isLoading,
    openMenuId,
    page,
    pendingArchive,
    pendingDelete,
    pendingMassDelete,
    pendingRestore,
    products,
    refreshTimerRef,
    searchQuery,
    selectAllMatching,
    selectedIds,
    skuTotalCount,
    stockStatusFilter,
    toast,
    totalCount,
    setCategoryFilter,
    setConditionFilter,
    setDetailsSelection,
    setExpandedVariants,
    setInventoryUnitTotalCount,
    setIsLoading,
    setOpenMenuId,
    setPage,
    setPendingArchive,
    setPendingDelete,
    setPendingMassDelete,
    setPendingRestore,
    setProducts,
    setSearchQuery,
    setSelectAllMatching,
    setSelectedIds,
    setSkuTotalCount,
    setStockStatusFilter,
    setToast,
    setTotalCount,
  } = useInventoryClientState({
    initialFilters,
    initialInventoryUnitTotal,
    initialProducts,
    initialSkuTotal,
    initialTotal,
  });

  const { totalPages, showingStart, showingEnd, currentFilters } =
    getInventoryDerivedState({
      pageSize: PAGE_SIZE,
      totalCount,
      page,
      searchQuery,
      categoryFilter,
      conditionFilter,
      stockStatusFilter,
    });
  const { currentPageIds, currentPageAllSelected, selectedCount } =
    getInventorySelectionState({
      products,
      selectedIds,
      selectAllMatching,
      totalCount,
    });

  const { exportInventory, loadProducts } = useInventoryClientData({
    pageSize: PAGE_SIZE,
    filtersRef,
    setIsLoading,
    setProducts,
    setTotalCount,
    setSkuTotalCount,
    setInventoryUnitTotalCount,
    setToast,
  });

  useInventoryClientEffects({
    page,
    totalPages,
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    currentFilters,
    openMenuId,
    loadProducts,
    setPage,
    setSelectedIds,
    setSelectAllMatching,
    setExpandedVariants,
    setOpenMenuId,
    filtersRef,
    refreshTimerRef,
  });

  const {
    clearSelection,
    confirmArchive,
    confirmDelete,
    confirmMassDelete,
    confirmRestore,
    handleDuplicate,
    handleMassArchive,
    handleMassDelete,
    handleMassRestore,
    handleSelectAllMatching,
    requestArchive,
    requestDelete,
    restoreProduct,
  } = useInventoryClientMutations({
    selectedIds,
    selectedCount,
    selectAllMatching,
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    currentFilters,
    pendingDelete,
    pendingArchive,
    pendingRestore,
    setSelectedIds,
    setSelectAllMatching,
    setOpenMenuId,
    setPendingDelete,
    setPendingMassDelete,
    setPendingArchive,
    setPendingRestore,
    setToast,
    loadProducts,
    getProductRawTitle,
  });

  const {
    getPrimaryImageUrl,
    getProductLiveState,
    getProductTotalStock,
    openDetailsModal,
    toggleMenu,
    toggleSelectCurrentPage,
    toggleSelection,
    toggleVariants,
  } = useInventoryClientHandlers({
    currentPageIds,
    setDetailsSelection,
    setExpandedVariants,
    setOpenMenuId,
    setSelectAllMatching,
    setSelectedIds,
  });

  return {
    exportInventory,
    headerDescription: getInventoryHeaderDescription(
      skuTotalCount,
      totalCount,
      inventoryUnitTotalCount,
    ),
    isLoading,
    contentProps: buildInventoryContentProps({
      isLoading,
      products,
      expandedVariants,
      selectedIds,
      openMenuId,
      currentPageAllSelected,
      onToggleCurrentPage: toggleSelectCurrentPage,
      onToggleSelection: toggleSelection,
      onToggleVariants: toggleVariants,
      onToggleMenu: toggleMenu,
      onRestoreProduct: (productId) => {
        void restoreProduct(productId);
      },
      onDuplicateProduct: (productId) => {
        void handleDuplicate(productId);
      },
      onRequestArchive: requestArchive,
      onRequestDelete: requestDelete,
      onOpenDetails: openDetailsModal,
      getProductRawTitle,
      getPrimaryImageUrl,
      getProductTotalStock,
      getProductLiveState,
    }),
    dialogsProps: buildInventoryDialogsProps({
      detailsSelection,
      pendingDelete,
      pendingMassDelete,
      pendingArchive,
      pendingRestore,
      selectedCount,
      toast,
      onCloseDetails: () => setDetailsSelection(null),
      onConfirmDelete: () => {
        void confirmDelete();
      },
      onCancelDelete: () => setPendingDelete(null),
      onConfirmMassDelete: () => {
        void confirmMassDelete();
      },
      onCancelMassDelete: () => setPendingMassDelete(false),
      onConfirmArchive: () => {
        void confirmArchive();
      },
      onCancelArchive: () => setPendingArchive(null),
      onConfirmRestore: () => {
        void confirmRestore();
      },
      onCancelRestore: () => setPendingRestore(null),
      onCloseToast: () => setToast(null),
    }),
    paginationProps: buildInventoryPaginationProps({
      page,
      totalPages,
      totalCount,
      showingStart,
      showingEnd,
      isLoading,
      onPageChange: setPage,
    }),
    toolbarProps: buildInventoryToolbarProps({
      totalCount,
      showingStart,
      showingEnd,
      stockStatusFilter,
      searchQuery,
      categoryFilter,
      conditionFilter,
      selectedCount,
      selectedIdsCount: selectedIds.length,
      selectAllMatching,
      currentPageAllSelected,
      onStockStatusFilterChange: setStockStatusFilter,
      onSearchQueryChange: setSearchQuery,
      onCategoryFilterChange: setCategoryFilter,
      onConditionFilterChange: setConditionFilter,
      onSelectAllMatching: handleSelectAllMatching,
      onClearSelection: clearSelection,
      onMassRestore: handleMassRestore,
      onMassArchive: handleMassArchive,
      onMassDelete: handleMassDelete,
    }),
  };
}
