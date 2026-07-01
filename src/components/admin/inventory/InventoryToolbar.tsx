import { Archive, RotateCcw, Search, Trash2 } from "lucide-react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import type {
  InventoryToolbarActions,
  InventoryToolbarFilters,
  InventoryToolbarSelection,
  InventoryToolbarSummary,
} from "@/components/admin/inventory/inventoryClientContracts";
import { RdkSelect } from "@/components/ui/Select";
import type { Category, Condition } from "@/types/domain/product";

type InventoryToolbarProps = InventoryToolbarSummary &
  InventoryToolbarFilters &
  InventoryToolbarSelection &
  InventoryToolbarActions;

const tabActiveStyles = "border-b-2 border-brand-text text-brand-text";
const tabInactiveStyles = "text-brand-muted transition hover:text-brand-text";

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

      <div className="flex space-x-6 border-b border-brand-border">
        <button
          onClick={() => onStockStatusFilterChange("in_stock")}
          className={`py-3 text-sm font-medium ${
            stockStatusFilter === "in_stock" ? tabActiveStyles : tabInactiveStyles
          }`}
          data-testid="inventory-filter-in-stock"
        >
          In Stock
        </button>
        <button
          onClick={() => onStockStatusFilterChange("archived")}
          className={`py-3 text-sm font-medium ${
            stockStatusFilter === "archived" ? tabActiveStyles : tabInactiveStyles
          }`}
          data-testid="inventory-filter-archived"
        >
          Archived
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex w-full items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2 lg:max-w-md">
          <Search className="h-4 w-4 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search raw names or SKU"
            className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="w-full sm:w-56">
            <RdkSelect
              value={categoryFilter}
              onChange={(value) => onCategoryFilterChange(value as Category | "all")}
              options={[
                { value: "all", label: "All categories" },
                { value: "sneakers", label: "Sneakers" },
                { value: "clothing", label: "Clothing" },
                { value: "accessories", label: "Accessories" },
                { value: "electronics", label: "Electronics" },
              ]}
            />
          </div>

          <div className="w-full sm:w-48">
            <RdkSelect
              value={conditionFilter}
              onChange={(value) => onConditionFilterChange(value as Condition | "all")}
              options={[
                { value: "all", label: "All conditions" },
                { value: "new", label: "New" },
                { value: "used", label: "Pre-owned" },
              ]}
            />
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-col gap-3 border border-brand-border bg-brand-surface p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-brand-text">
              {selectAllMatching
                ? `All ${selectedCount} matching products selected`
                : `${selectedCount} selected`}
            </span>
            {!selectAllMatching &&
              currentPageAllSelected &&
              totalCount > selectedIdsCount && (
                <button
                  type="button"
                  onClick={onSelectAllMatching}
                  className="text-brand-text transition hover:text-black"
                >
                  Select all {totalCount} products
                </button>
              )}
            <button
              type="button"
              onClick={onClearSelection}
              className="text-brand-muted transition hover:text-brand-text"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stockStatusFilter === "archived" ? (
              <button
                onClick={onMassRestore}
                className="flex cursor-pointer items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 transition hover:bg-emerald-100"
              >
                <RotateCcw className="h-4 w-4" />
                Unarchive Selected
              </button>
            ) : (
              <button
                onClick={onMassArchive}
                className="flex cursor-pointer items-center gap-2 border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100"
              >
                <Archive className="h-4 w-4" />
                Archive Selected
              </button>
            )}
            <button
              onClick={onMassDelete}
              className={`${adminButtonStyles.secondary} cursor-pointer gap-2`}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}
    </>
  );
}
