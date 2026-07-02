import type { StockStatus } from "@/components/admin/inventory/inventoryClientData";

type InventoryStockStatusTabsProps = {
  stockStatusFilter: StockStatus;
  onStockStatusFilterChange: (value: StockStatus) => void;
};

const tabActiveStyles = "border-b-2 border-brand-text text-brand-text";
const tabInactiveStyles = "text-brand-muted transition hover:text-brand-text";

export function InventoryStockStatusTabs({
  stockStatusFilter,
  onStockStatusFilterChange,
}: InventoryStockStatusTabsProps) {
  return (
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
  );
}
