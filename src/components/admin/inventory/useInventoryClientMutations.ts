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
  buildInventoryBulkMutationRequest,
  buildInventoryItemActionUrl,
  buildInventoryItemRequestInit,
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
import { clearInventorySelection } from "@/components/admin/inventory/inventoryClientSelection";
import { filterInventorySelectionAfterRestore } from "@/components/admin/inventory/inventoryClientUiState";
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
    if (!pendingDelete) {
      return;
    }

    const { id, label } = pendingDelete;
    setPendingDelete(null);

    try {
      const response = await fetch(
        buildInventoryItemActionUrl(id),
        buildInventoryItemRequestInit("DELETE"),
      );
      const payload = await response.json().catch(() => null);
      const errorMessage = getInventoryMutationErrorMessage(
        payload,
        "Failed to delete product.",
      );

      if (response.ok) {
        showToast(`Deleted ${label}.`, "success");
        await loadProducts(currentFilters);
      } else {
        showToast(errorMessage, "error");
      }
    } catch {
      showToast("Error deleting product.", "error");
    }
  };

  const confirmMassDelete = async () => {
    setPendingMassDelete(false);
    if (selectedCount === 0) {
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/products",
        buildInventoryBulkMutationRequest(
          buildInventoryBulkSelectionArgs({
            action: "delete",
            selectAllMatching,
            selectedIds,
            searchQuery,
            categoryFilter,
            conditionFilter,
            stockStatusFilter,
          }),
        ),
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(
          getInventoryMutationErrorMessage(payload, "Failed to delete selected items."),
          "error",
        );
        return;
      }

      const deleteOutcome = summarizeInventoryDeleteOutcome(payload);
      showToast(deleteOutcome.message, deleteOutcome.tone);
      clearSelection();
      await loadProducts(currentFilters);
    } catch {
      showToast("Error deleting selected items.", "error");
    }
  };

  const restoreProduct = async (productId: string) => {
    setOpenMenuId(null);

    try {
      const response = await fetch(
        buildInventoryItemActionUrl(productId, "restore"),
        buildInventoryItemRequestInit("PATCH"),
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(
          getInventoryMutationErrorMessage(payload, "Failed to restore product."),
          "error",
        );
        return;
      }

      showToast("Product restored.", "success");
      setSelectedIds((prev) => filterInventorySelectionAfterRestore(prev, productId));
      await loadProducts(currentFilters);
    } catch {
      showToast("Error restoring product.", "error");
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore || selectedCount === 0) {
      setPendingRestore(null);
      return;
    }

    setPendingRestore(null);

    try {
      const response = await fetch(
        "/api/admin/products",
        buildInventoryBulkMutationRequest(
          buildInventoryBulkSelectionArgs({
            action: "restore",
            selectAllMatching,
            selectedIds,
            searchQuery,
            categoryFilter,
            conditionFilter,
            stockStatusFilter,
            stockStatusOverride: "archived",
          }),
        ),
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(
          getInventoryMutationErrorMessage(
            payload,
            "Failed to restore selected products.",
          ),
          "error",
        );
        return;
      }

      showToast(
        getInventoryRestoreSuccessMessage({
          payload,
          pendingCount: pendingRestore.count,
          selectedCount,
        }),
        "success",
      );
      clearSelection();
      await loadProducts(currentFilters);
    } catch {
      showToast("Error restoring selected products.", "error");
    }
  };

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null);

    try {
      const response = await fetch(
        `${buildInventoryItemActionUrl(id)}/duplicate`,
        buildInventoryItemRequestInit("POST"),
      );
      if (response.ok) {
        showToast("Product duplicated.", "success");
        await loadProducts(currentFilters);
      } else {
        showToast("Failed to duplicate product.", "error");
      }
    } catch {
      showToast("Error duplicating product.", "error");
    }
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
    if (!pendingArchive) {
      return;
    }

    const archiveTarget = pendingArchive;
    setPendingArchive(null);

    try {
      if (archiveTarget.mode === "single" && archiveTarget.id) {
        const response = await fetch(
          buildInventoryItemActionUrl(archiveTarget.id, "archive"),
          buildInventoryItemRequestInit("PATCH"),
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          showToast(
            getInventoryMutationErrorMessage(payload, "Failed to archive product."),
            "error",
          );
          return;
        }
        showToast(`Archived ${archiveTarget.label}.`, "success");
      } else {
        const response = await fetch(
          "/api/admin/products",
          buildInventoryBulkMutationRequest(
            buildInventoryBulkSelectionArgs({
              action: "archive",
              selectAllMatching,
              selectedIds,
              searchQuery,
              categoryFilter,
              conditionFilter,
              stockStatusFilter,
            }),
          ),
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          showToast(
            getInventoryMutationErrorMessage(
              payload,
              "Failed to archive selected products.",
            ),
            "error",
          );
          return;
        }
        showToast(
          summarizeInventoryArchiveOutcome({
            payload,
            fallbackCount: archiveTarget.count ?? selectedCount,
          }),
          "success",
        );
        clearSelection();
      }

      await loadProducts(currentFilters);
    } catch {
      showToast("Error archiving product.", "error");
    }
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
