import type {
  InventoryToolbarActions,
  InventoryToolbarFilters,
  InventoryToolbarSelection,
  InventoryToolbarSummary,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";

import { InventoryBulkActionsBar } from "@/modules/catalog/presentation/admin/inventory/InventoryBulkActionsBar";
import { InventoryFilterControls } from "@/modules/catalog/presentation/admin/inventory/InventoryFilterControls";
import { InventoryStockStatusTabs } from "@/modules/catalog/presentation/admin/inventory/InventoryStockStatusTabs";

type InventoryToolbarProps = InventoryToolbarSummary &
  InventoryToolbarFilters &
  InventoryToolbarSelection &
  InventoryToolbarActions;

export function InventoryToolbar({
  totalCount,
  showingStart,
  showingEnd,
  stockStatusFilter,
  searchQuery,
  categoryFilter,
  conditionFilter,
  selectedCount,
  selectedIdsCount,
  selectAllMatching,
  currentPageAllSelected,
  onStockStatusFilterChange,
  onSearchQueryChange,
  onCategoryFilterChange,
  onConditionFilterChange,
  onSelectAllMatching,
  onClearSelection,
  onMassRestore,
  onMassArchive,
  onMassDelete,
}: InventoryToolbarProps) {
  return (
    <>
      <div className="space-y-1 text-sm text-brand-muted">
        <p>
          {totalCount} total products
          {totalCount > 0 && (
            <span>
              {" "}
              (showing {showingStart}-{showingEnd})
            </span>
          )}
        </p>
      </div>

      <InventoryStockStatusTabs
        stockStatusFilter={stockStatusFilter}
        onStockStatusFilterChange={onStockStatusFilterChange}
      />

      <InventoryFilterControls
        stockStatusFilter={stockStatusFilter}
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        conditionFilter={conditionFilter}
        onSearchQueryChange={onSearchQueryChange}
        onCategoryFilterChange={onCategoryFilterChange}
        onConditionFilterChange={onConditionFilterChange}
      />

      <InventoryBulkActionsBar
        currentPageAllSelected={currentPageAllSelected}
        onClearSelection={onClearSelection}
        onMassArchive={onMassArchive}
        onMassDelete={onMassDelete}
        onMassRestore={onMassRestore}
        onSelectAllMatching={onSelectAllMatching}
        selectAllMatching={selectAllMatching}
        selectedCount={selectedCount}
        selectedIdsCount={selectedIdsCount}
        stockStatusFilter={stockStatusFilter}
        totalCount={totalCount}
      />
    </>
  );
}
