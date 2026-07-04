import { Archive, RotateCcw, Trash2 } from "lucide-react";

import type {
  InventoryToolbarActions,
  InventoryToolbarFilters,
  InventoryToolbarSelection,
  InventoryToolbarSummary,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type InventoryBulkActionsBarProps = Pick<
  InventoryToolbarActions,
  | "onClearSelection"
  | "onMassArchive"
  | "onMassDelete"
  | "onMassRestore"
  | "onSelectAllMatching"
> &
  Pick<InventoryToolbarFilters, "stockStatusFilter"> &
  InventoryToolbarSelection &
  Pick<InventoryToolbarSummary, "totalCount">;

export function InventoryBulkActionsBar({
  currentPageAllSelected,
  onClearSelection,
  onMassArchive,
  onMassDelete,
  onMassRestore,
  onSelectAllMatching,
  selectAllMatching,
  selectedCount,
  selectedIdsCount,
  stockStatusFilter,
  totalCount,
}: InventoryBulkActionsBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border border-brand-border bg-brand-surface p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-brand-text">
          {selectAllMatching
            ? `All ${selectedCount} matching products selected`
            : `${selectedCount} selected`}
        </span>
        {!selectAllMatching && currentPageAllSelected && totalCount > selectedIdsCount && (
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
  );
}
