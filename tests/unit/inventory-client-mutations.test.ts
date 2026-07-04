import {
  buildInventoryBulkSelectionArgs,
  buildInventoryBulkMutationRequest,
  buildInventoryItemActionUrl,
  buildInventoryItemRequestInit,
  getInventoryMutationErrorMessage,
  getInventoryRestoreSuccessMessage,
  summarizeInventoryDeleteOutcome,
  summarizeInventoryArchiveOutcome,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientMutations";

describe("inventoryClientMutations", () => {
  it("builds item action urls", () => {
    expect(buildInventoryItemActionUrl("product-1")).toBe(
      "/api/admin/products/product-1",
    );
    expect(buildInventoryItemActionUrl("product-1", "archive")).toBe(
      "/api/admin/products/product-1?action=archive",
    );
  });

  it("builds item request init objects", () => {
    expect(buildInventoryItemRequestInit("DELETE")).toEqual({ method: "DELETE" });
  });

  it("builds bulk mutation request init objects", () => {
    expect(
      buildInventoryBulkMutationRequest({
        action: "delete",
        selectionMode: "ids",
        ids: ["a", "b"],
      }),
    ).toEqual({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        selectionMode: "ids",
        ids: ["a", "b"],
      }),
    });
  });

  it("builds filtered bulk selection args from current inventory filters", () => {
    expect(
      buildInventoryBulkSelectionArgs({
        action: "archive",
        selectAllMatching: true,
        selectedIds: ["a", "b"],
        searchQuery: " jordan 1 ",
        categoryFilter: "sneakers",
        conditionFilter: "new",
        stockStatusFilter: "in_stock",
      }),
    ).toEqual({
      action: "archive",
      selectionMode: "filtered",
      filters: {
        q: " jordan 1 ",
        category: "sneakers",
        condition: "new",
        stockStatus: "in_stock",
      },
    });
  });

  it("uses id selection args when not targeting all filtered results", () => {
    expect(
      buildInventoryBulkSelectionArgs({
        action: "delete",
        selectAllMatching: false,
        selectedIds: ["a", "b"],
        searchQuery: "ignored",
        categoryFilter: "all",
        conditionFilter: "all",
        stockStatusFilter: "archived",
      }),
    ).toEqual({
      action: "delete",
      selectionMode: "ids",
      ids: ["a", "b"],
    });
  });

  it("allows overriding stock status for filtered bulk selection args", () => {
    expect(
      buildInventoryBulkSelectionArgs({
        action: "restore",
        selectAllMatching: true,
        selectedIds: ["a"],
        searchQuery: "",
        categoryFilter: "all",
        conditionFilter: "all",
        stockStatusFilter: "in_stock",
        stockStatusOverride: "archived",
      }),
    ).toEqual({
      action: "restore",
      selectionMode: "filtered",
      filters: {
        q: undefined,
        category: "all",
        condition: "all",
        stockStatus: "archived",
      },
    });
  });

  it("extracts api error strings or falls back", () => {
    expect(
      getInventoryMutationErrorMessage({ error: "Failed badly" }, "Default message"),
    ).toBe("Failed badly");
    expect(getInventoryMutationErrorMessage({}, "Default message")).toBe(
      "Default message",
    );
  });

  it("summarizes delete outcome with failures", () => {
    expect(summarizeInventoryDeleteOutcome({ deletedCount: 3, failedCount: 1 })).toEqual({
      message: "Deleted 3 items, 1 failed.",
      tone: "error",
    });
  });

  it("summarizes archive outcome from payload count fallback", () => {
    expect(
      summarizeInventoryArchiveOutcome({
        payload: { archivedCount: 4 },
        fallbackCount: 2,
      }),
    ).toBe("Archived 4 products.");
  });

  it("summarizes restore outcome from pending fallback", () => {
    expect(
      getInventoryRestoreSuccessMessage({
        payload: {},
        pendingCount: 5,
        selectedCount: 2,
      }),
    ).toBe("Restored 5 products.");
  });
});
