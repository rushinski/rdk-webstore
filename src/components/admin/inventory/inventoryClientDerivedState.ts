import type { Category, Condition } from "@/types/domain/product";
import type {
  InventoryFilters,
  StockStatus,
} from "@/components/admin/inventory/inventoryClientData";

export function getInventoryDerivedState({
  pageSize,
  totalCount,
  page,
  searchQuery,
  categoryFilter,
  conditionFilter,
  stockStatusFilter,
}: {
  pageSize: number;
  totalCount: number;
  page: number;
  searchQuery: string;
  categoryFilter: Category | "all";
  conditionFilter: Condition | "all";
  stockStatusFilter: StockStatus;
}) {
  return {
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    showingStart: totalCount === 0 ? 0 : (page - 1) * pageSize + 1,
    showingEnd: totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount),
    currentFilters: {
      q: searchQuery,
      category: categoryFilter,
      condition: conditionFilter,
      stockStatus: stockStatusFilter,
      page,
    } satisfies InventoryFilters,
  };
}
