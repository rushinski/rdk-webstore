import type { Dispatch, SetStateAction } from "react";

import type {
  InventoryArchiveRequestState,
  InventoryDeleteRequestState,
  InventoryRestoreRequestState,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import type {
  InventoryFilters,
  StockStatus,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientData";
import type { InventoryBulkSelectionArgs } from "@/modules/catalog/presentation/admin/inventory/inventoryMutationRequests";

type MutationTone = "success" | "error" | "info";

type InventoryMutationSelectionArgs = {
  selectedIds: string[];
  selectedCount: number;
  selectAllMatching: boolean;
  searchQuery: string;
  categoryFilter: InventoryFilters["category"];
  conditionFilter: InventoryFilters["condition"];
  stockStatusFilter: StockStatus;
  currentFilters: InventoryFilters;
};

type InventoryMutationFlowBase = InventoryMutationSelectionArgs & {
  loadProducts: (filters?: InventoryFilters, showLoading?: boolean) => Promise<void>;
  showToast: (message: string, tone?: MutationTone) => void;
};

type MutationHelpers = {
  buildInventoryBulkSelectionArgs: (
    args: {
      action: "archive" | "delete" | "restore";
      selectAllMatching: boolean;
      selectedIds: string[];
      searchQuery: string;
      categoryFilter: InventoryFilters["category"];
      conditionFilter: InventoryFilters["condition"];
      stockStatusFilter: StockStatus;
      stockStatusOverride?: StockStatus;
    },
  ) => InventoryBulkSelectionArgs;
  getInventoryMutationErrorMessage: (
    payload: Record<string, unknown> | null,
    fallbackMessage: string,
  ) => string;
  getInventoryRestoreSuccessMessage: (args: {
    payload: Record<string, unknown> | null;
    pendingCount?: number;
    selectedCount: number;
  }) => string;
  summarizeInventoryArchiveOutcome: (args: {
    payload: Record<string, unknown> | null;
    fallbackCount: number;
  }) => string;
  summarizeInventoryDeleteOutcome: (payload: Record<string, unknown> | null) => {
    message: string;
    tone: "success" | "error";
  };
};

type MutationRequests = {
  archiveInventoryItemRequest: (productId: string) => Promise<Response>;
  archiveInventorySelectionRequest: (
    selectionArgs: InventoryBulkSelectionArgs,
  ) => Promise<Response>;
  deleteInventoryItemRequest: (productId: string) => Promise<Response>;
  deleteInventorySelectionRequest: (
    selectionArgs: InventoryBulkSelectionArgs,
  ) => Promise<Response>;
  duplicateInventoryItemRequest: (productId: string) => Promise<Response>;
  restoreInventoryItemRequest: (productId: string) => Promise<Response>;
  restoreInventorySelectionRequest: (
    selectionArgs: InventoryBulkSelectionArgs,
  ) => Promise<Response>;
};

export async function confirmInventoryDeleteFlow({
  currentFilters,
  loadProducts,
  mutationHelpers,
  mutationRequests,
  pendingDelete,
  setPendingDelete,
  showToast,
}: Pick<InventoryMutationFlowBase, "currentFilters" | "loadProducts" | "showToast"> & {
  mutationHelpers: Pick<MutationHelpers, "getInventoryMutationErrorMessage">;
  mutationRequests: Pick<MutationRequests, "deleteInventoryItemRequest">;
  pendingDelete: InventoryDeleteRequestState;
  setPendingDelete: (value: InventoryDeleteRequestState) => void;
}) {
  if (!pendingDelete) {
    return;
  }

  const { id, label } = pendingDelete;
  setPendingDelete(null);

  try {
    const response = await mutationRequests.deleteInventoryItemRequest(id);
    const payload = await response.json().catch(() => null);
    const errorMessage = mutationHelpers.getInventoryMutationErrorMessage(
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
}

export async function confirmInventoryMassDeleteFlow({
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
}: InventoryMutationFlowBase & {
  clearSelection: () => void;
  mutationHelpers: Pick<
    MutationHelpers,
    | "buildInventoryBulkSelectionArgs"
    | "getInventoryMutationErrorMessage"
    | "summarizeInventoryDeleteOutcome"
  >;
  mutationRequests: Pick<MutationRequests, "deleteInventorySelectionRequest">;
  setPendingMassDelete: (value: boolean) => void;
}) {
  setPendingMassDelete(false);
  if (selectedCount === 0) {
    return;
  }

  try {
    const response = await mutationRequests.deleteInventorySelectionRequest(
      mutationHelpers.buildInventoryBulkSelectionArgs({
        action: "delete",
        selectAllMatching,
        selectedIds,
        searchQuery,
        categoryFilter,
        conditionFilter,
        stockStatusFilter,
      }),
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      showToast(
        mutationHelpers.getInventoryMutationErrorMessage(
          payload,
          "Failed to delete selected items.",
        ),
        "error",
      );
      return;
    }

    const deleteOutcome = mutationHelpers.summarizeInventoryDeleteOutcome(payload);
    showToast(deleteOutcome.message, deleteOutcome.tone);
    clearSelection();
    await loadProducts(currentFilters);
  } catch {
    showToast("Error deleting selected items.", "error");
  }
}

export async function restoreInventoryProductFlow({
  currentFilters,
  loadProducts,
  mutationHelpers,
  mutationRequests,
  productId,
  setSelectedIds,
  showToast,
}: Pick<InventoryMutationFlowBase, "currentFilters" | "loadProducts" | "showToast"> & {
  mutationHelpers: Pick<MutationHelpers, "getInventoryMutationErrorMessage">;
  mutationRequests: Pick<MutationRequests, "restoreInventoryItemRequest">;
  productId: string;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
}) {
  try {
    const response = await mutationRequests.restoreInventoryItemRequest(productId);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      showToast(
        mutationHelpers.getInventoryMutationErrorMessage(
          payload,
          "Failed to restore product.",
        ),
        "error",
      );
      return;
    }

    showToast("Product restored.", "success");
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
    await loadProducts(currentFilters);
  } catch {
    showToast("Error restoring product.", "error");
  }
}

export async function confirmInventoryRestoreFlow({
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
}: InventoryMutationFlowBase & {
  clearSelection: () => void;
  mutationHelpers: Pick<
    MutationHelpers,
    | "buildInventoryBulkSelectionArgs"
    | "getInventoryMutationErrorMessage"
    | "getInventoryRestoreSuccessMessage"
  >;
  mutationRequests: Pick<MutationRequests, "restoreInventorySelectionRequest">;
  pendingRestore: InventoryRestoreRequestState;
  setPendingRestore: (value: InventoryRestoreRequestState) => void;
}) {
  if (!pendingRestore || selectedCount === 0) {
    setPendingRestore(null);
    return;
  }

  setPendingRestore(null);

  try {
    const response = await mutationRequests.restoreInventorySelectionRequest(
      mutationHelpers.buildInventoryBulkSelectionArgs({
        action: "restore",
        selectAllMatching,
        selectedIds,
        searchQuery,
        categoryFilter,
        conditionFilter,
        stockStatusFilter,
        stockStatusOverride: "archived",
      }),
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      showToast(
        mutationHelpers.getInventoryMutationErrorMessage(
          payload,
          "Failed to restore selected products.",
        ),
        "error",
      );
      return;
    }

    showToast(
      mutationHelpers.getInventoryRestoreSuccessMessage({
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
}

export async function duplicateInventoryProductFlow({
  currentFilters,
  id,
  loadProducts,
  mutationRequests,
  showToast,
}: Pick<InventoryMutationFlowBase, "currentFilters" | "loadProducts" | "showToast"> & {
  id: string;
  mutationRequests: Pick<MutationRequests, "duplicateInventoryItemRequest">;
}) {
  try {
    const response = await mutationRequests.duplicateInventoryItemRequest(id);
    if (response.ok) {
      showToast("Product duplicated.", "success");
      await loadProducts(currentFilters);
    } else {
      showToast("Failed to duplicate product.", "error");
    }
  } catch {
    showToast("Error duplicating product.", "error");
  }
}

export async function confirmInventoryArchiveFlow({
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
}: InventoryMutationFlowBase & {
  clearSelection: () => void;
  mutationHelpers: Pick<
    MutationHelpers,
    | "buildInventoryBulkSelectionArgs"
    | "getInventoryMutationErrorMessage"
    | "summarizeInventoryArchiveOutcome"
  >;
  mutationRequests: Pick<
    MutationRequests,
    "archiveInventoryItemRequest" | "archiveInventorySelectionRequest"
  >;
  pendingArchive: InventoryArchiveRequestState;
  setPendingArchive: (value: InventoryArchiveRequestState) => void;
}) {
  if (!pendingArchive) {
    return;
  }

  const archiveTarget = pendingArchive;
  setPendingArchive(null);

  try {
    if (archiveTarget.mode === "single" && archiveTarget.id) {
      const response = await mutationRequests.archiveInventoryItemRequest(archiveTarget.id);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(
          mutationHelpers.getInventoryMutationErrorMessage(
            payload,
            "Failed to archive product.",
          ),
          "error",
        );
        return;
      }
      showToast(`Archived ${archiveTarget.label}.`, "success");
    } else {
      const response = await mutationRequests.archiveInventorySelectionRequest(
        mutationHelpers.buildInventoryBulkSelectionArgs({
          action: "archive",
          selectAllMatching,
          selectedIds,
          searchQuery,
          categoryFilter,
          conditionFilter,
          stockStatusFilter,
        }),
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(
          mutationHelpers.getInventoryMutationErrorMessage(
            payload,
            "Failed to archive selected products.",
          ),
          "error",
        );
        return;
      }
      showToast(
        mutationHelpers.summarizeInventoryArchiveOutcome({
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
}
