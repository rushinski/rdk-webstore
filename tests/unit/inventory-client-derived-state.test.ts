import type { InventoryFilters } from "@/modules/catalog/presentation/admin/inventory/inventoryClientData";
import { getInventoryDerivedState } from "@/modules/catalog/presentation/admin/inventory/inventoryClientDerivedState";

describe("inventoryClientDerivedState", () => {
  it("builds current filters and pagination state", () => {
    const result = getInventoryDerivedState({
      pageSize: 100,
      totalCount: 250,
      page: 2,
      searchQuery: "jordan",
      categoryFilter: "sneakers",
      conditionFilter: "new",
      stockStatusFilter: "archived",
    });

    expect(result.totalPages).toBe(3);
    expect(result.showingStart).toBe(101);
    expect(result.showingEnd).toBe(200);
    expect(result.currentFilters).toEqual<InventoryFilters>({
      q: "jordan",
      category: "sneakers",
      condition: "new",
      stockStatus: "archived",
      page: 2,
    });
  });

  it("handles empty totals", () => {
    const result = getInventoryDerivedState({
      pageSize: 100,
      totalCount: 0,
      page: 1,
      searchQuery: "",
      categoryFilter: "all",
      conditionFilter: "all",
      stockStatusFilter: "in_stock",
    });

    expect(result.totalPages).toBe(1);
    expect(result.showingStart).toBe(0);
    expect(result.showingEnd).toBe(0);
  });
});
