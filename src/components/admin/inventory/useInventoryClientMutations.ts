"use client";

import type { Dispatch, SetStateAction } from "react";

import {
  canArchiveInventorySelection,
  canDeleteInventorySelection,
  canEnableSelectAllMatching,
  canRestoreInventorySelection,
  createInventoryArchiveRequest,
  createInventoryDeleteRequest,
  createInventoryRestoreRequest,
} from "@/components/admin/inventory/inventoryClientActions";
import type {
  InventoryFilters,
  StockStatus,
} from "@/components/admin/inventory/inventoryClientData";
import {
  buildInventoryBulkSelectionArgs,
  getInventoryMutationErrorMessage,
  getInventoryRestoreSuccessMessage,
  summarizeInventoryArchiveOutcome,
  summarizeInventoryDeleteOutcome,
} from "@/components/admin/inventory/inventoryClientMutations";
import type {
  InventoryArchiveRequestState,
  InventoryDeleteRequestState,
  InventoryRestoreRequestState,
  InventoryToastState,
} from "@/components/admin/inventory/inventoryClientContracts";
import {
  confirmInventoryArchiveFlow,
  confirmInventoryDeleteFlow,
  confirmInventoryMassDeleteFlow,
  confirmInventoryRestoreFlow,
  duplicateInventoryProductFlow,
  restoreInventoryProductFlow,
} from "@/components/admin/inventory/inventoryMutationFlows";
import {
  archiveInventoryItemRequest,
  archiveInventorySelectionRequest,
  deleteInventoryItemRequest,
  deleteInventorySelectionRequest,
  duplicateInventoryItemRequest,
  restoreInventoryItemRequest,
  restoreInventorySelectionRequest,
} from "@/components/admin/inventory/inventoryMutationRequests";
import { clearInventorySelection } from "@/components/admin/inventory/inventoryClientSelection";
import type { Category, Condition, ProductWithDetails } from "@/types/domain/product";

type UseInventoryClientMutationsArgs = {
  selectedIds: string[];
  selectedCount: number;
  selectAllMatching: boolean;
  searchQuery: string;
  categoryFilter: Category | "all";
  conditionFilter: Condition | "all";
  stockStatusFilter: StockStatus;
  currentFilters: InventoryFilters;
  pendingDelete: InventoryDeleteRequestState;
  pendingArchive: InventoryArchiveRequestState;
  pendingRestore: InventoryRestoreRequestState;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setSelectAllMatching: Dispatch<SetStateAction<boolean>>;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
  setPendingDelete: Dispatch<SetStateAction<InventoryDeleteRequestState>>;
  setPendingMassDelete: Dispatch<SetStateAction<boolean>>;
  setPendingArchive: Dispatch<SetStateAction<InventoryArchiveRequestState>>;
  setPendingRestore: Dispatch<SetStateAction<InventoryRestoreRequestState>>;
  setToast: Dispatch<SetStateAction<InventoryToastState>>;
  loadProducts: (filters?: InventoryFilters, showLoading?: boolean) => Promise<void>;
  getProductRawTitle: (product: ProductWithDetails) => string;
};

export function useInventoryClientMutations({
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
}: UseInventoryClientMutationsArgs) {
  const showToast = (message: string, tone: "success" | "error" | "info" = "info") => {
    setToast({ message, tone });
  };

  const mutationHelpers = {
    buildInventoryBulkSelectionArgs,
    getInventoryMutationErrorMessage,
    getInventoryRestoreSuccessMessage,
    summarizeInventoryArchiveOutcome,
    summarizeInventoryDeleteOutcome,
  };

  const mutationRequests = {
    archiveInventoryItemRequest: (productId: string) =>
      archiveInventoryItemRequest(productId),
    archiveInventorySelectionRequest: (
      selectionArgs: Parameters<typeof archiveInventorySelectionRequest>[0],
    ) =>
      archiveInventorySelectionRequest(selectionArgs),
    deleteInventoryItemRequest: (productId: string) =>
      deleteInventoryItemRequest(productId),
    deleteInventorySelectionRequest: (
      selectionArgs: Parameters<typeof deleteInventorySelectionRequest>[0],
    ) =>
      deleteInventorySelectionRequest(selectionArgs),
    duplicateInventoryItemRequest: (productId: string) =>
      duplicateInventoryItemRequest(productId),
    restoreInventoryItemRequest: (productId: string) =>
      restoreInventoryItemRequest(productId),
    restoreInventorySelectionRequest: (
      selectionArgs: Parameters<typeof restoreInventorySelectionRequest>[0],
    ) =>
      restoreInventorySelectionRequest(selectionArgs),
  };

  const clearSelection = () => {
    const nextState = clearInventorySelection();
    setSelectedIds(nextState.selectedIds);
    setSelectAllMatching(nextState.selectAllMatching);
  };

  const requestDelete = (product: ProductWithDetails) => {
    setOpenMenuId(null);
    const label = getProductRawTitle(product);
    setPendingDelete(createInventoryDeleteRequest(product, label || "this product"));
  };

  const requestArchive = (product: ProductWithDetails) => {
    setOpenMenuId(null);
    setPendingArchive(
      createInventoryArchiveRequest({
        product,
        label: getProductRawTitle(product) || "this product",
      }),
    );
  };

  const confirmDelete = async () => {
    await confirmInventoryDeleteFlow({
      pendingDelete,
      setPendingDelete,
      currentFilters,
      loadProducts,
      mutationHelpers,
      mutationRequests,
      showToast,
    });
  };

  const confirmMassDelete = async () => {
    await confirmInventoryMassDeleteFlow({
      categoryFilter,
      clearSelection,
      conditionFilter,
      currentFilters,
      loadProducts,
      mutationHelpers,
      mutationRequests,
      searchQuery,
      selectedCount,
      selectedIds,
      selectAllMatching,
      setPendingMassDelete,
      showToast,
      stockStatusFilter,
    });
  };

  const restoreProduct = async (productId: string) => {
    setOpenMenuId(null);
    await restoreInventoryProductFlow({
      currentFilters,
      loadProducts,
      mutationHelpers,
      mutationRequests,
      productId,
      setSelectedIds,
      showToast,
    });
  };

  const confirmRestore = async () => {
    await confirmInventoryRestoreFlow({
      categoryFilter,
      clearSelection,
      conditionFilter,
      currentFilters,
      loadProducts,
      mutationHelpers,
      mutationRequests,
      pendingRestore,
      searchQuery,
      selectedCount,
      selectedIds,
      selectAllMatching,
      setPendingRestore,
      showToast,
      stockStatusFilter,
    });
  };

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null);
    await duplicateInventoryProductFlow({
      currentFilters,
      id,
      loadProducts,
      mutationRequests,
      showToast,
    });
  };

  const handleMassDelete = () => {
    if (!canDeleteInventorySelection(selectedCount)) {
      return;
    }

    setPendingMassDelete(true);
  };

  const handleMassRestore = () => {
    if (!canRestoreInventorySelection(selectedCount, stockStatusFilter)) {
      return;
    }

    setPendingRestore(createInventoryRestoreRequest(selectedCount));
  };

  const handleSelectAllMatching = () => {
    if (!canEnableSelectAllMatching(selectedIds.length)) {
      return;
    }

    setSelectAllMatching(true);
  };

  const confirmArchive = async () => {
    await confirmInventoryArchiveFlow({
      categoryFilter,
      clearSelection,
      conditionFilter,
      currentFilters,
      loadProducts,
      mutationHelpers,
      mutationRequests,
      pendingArchive,
      searchQuery,
      selectedCount,
      selectedIds,
      selectAllMatching,
      setPendingArchive,
      showToast,
      stockStatusFilter,
    });
  };

  const handleMassArchive = () => {
    if (!canArchiveInventorySelection(selectedCount, stockStatusFilter)) {
      return;
    }

    setPendingArchive(createInventoryArchiveRequest({ count: selectedCount }));
  };

  return {
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
  };
}
