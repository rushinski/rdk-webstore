import {
  buildInventoryBulkActionRequest,
  type InventoryFilters,
  type StockStatus,
} from "@/components/admin/inventory/inventoryClientData";

type MutationPayload = Record<string, unknown> | null;
type MutationAction = "archive" | "delete" | "restore";

type BuildInventoryBulkSelectionArgsInput = {
  action: MutationAction;
  selectAllMatching: boolean;
  selectedIds: string[];
  searchQuery: string;
  categoryFilter: InventoryFilters["category"];
  conditionFilter: InventoryFilters["condition"];
  stockStatusFilter: StockStatus;
  stockStatusOverride?: StockStatus;
};

export function buildInventoryItemActionUrl(
  productId: string,
  action?: "archive" | "restore",
): string {
  if (!action) {
    return `/api/admin/products/${productId}`;
  }

  return `/api/admin/products/${productId}?action=${action}`;
}

export function buildInventoryItemRequestInit(method: "DELETE" | "PATCH" | "POST") {
  return { method };
}

export function buildInventoryBulkMutationRequest(
  args: Parameters<typeof buildInventoryBulkActionRequest>[0],
) {
  return {
    method: "PATCH" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildInventoryBulkActionRequest(args)),
  };
}

export function buildInventoryBulkSelectionArgs({
  action,
  selectAllMatching,
  selectedIds,
  searchQuery,
  categoryFilter,
  conditionFilter,
  stockStatusFilter,
  stockStatusOverride,
}: BuildInventoryBulkSelectionArgsInput): Parameters<
  typeof buildInventoryBulkActionRequest
>[0] {
  if (!selectAllMatching) {
    return {
      action,
      selectionMode: "ids",
      ids: selectedIds,
    };
  }

  return {
    action,
    selectionMode: "filtered",
    filters: {
      q: searchQuery || undefined,
      category: categoryFilter,
      condition: conditionFilter,
      stockStatus: stockStatusOverride ?? stockStatusFilter,
    },
  };
}

export function getInventoryMutationErrorMessage(
  payload: MutationPayload,
  fallbackMessage: string,
): string {
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallbackMessage;
}

export function summarizeInventoryDeleteOutcome(payload: MutationPayload): {
  message: string;
  tone: "success" | "error";
} {
  const deletedCount = Number(payload?.deletedCount ?? 0);
  const failedCount = Number(payload?.failedCount ?? 0);

  if (failedCount > 0) {
    return {
      message: `Deleted ${deletedCount} items, ${failedCount} failed.`,
      tone: "error",
    };
  }

  return {
    message: `Deleted ${deletedCount} items.`,
    tone: "success",
  };
}

export function summarizeInventoryArchiveOutcome({
  payload,
  fallbackCount,
}: {
  payload: MutationPayload;
  fallbackCount: number;
}): string {
  return `Archived ${Number(payload?.archivedCount ?? fallbackCount)} products.`;
}

export function getInventoryRestoreSuccessMessage({
  payload,
  pendingCount,
  selectedCount,
}: {
  payload: MutationPayload;
  pendingCount?: number;
  selectedCount: number;
}): string {
  return `Restored ${Number(payload?.restoredCount ?? pendingCount ?? selectedCount)} products.`;
}
