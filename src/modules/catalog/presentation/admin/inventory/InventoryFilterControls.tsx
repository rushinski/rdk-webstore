import { Search } from "lucide-react";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import type { InventoryToolbarFilters } from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import { RdkSelect } from "@/components/ui/Select";
import type { Category, Condition } from "@/types/domain/product";

type InventoryFilterControlsProps = InventoryToolbarFilters & {
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: Category | "all") => void;
  onConditionFilterChange: (value: Condition | "all") => void;
};

export function InventoryFilterControls({
  searchQuery,
  categoryFilter,
  conditionFilter,
  onSearchQueryChange,
  onCategoryFilterChange,
  onConditionFilterChange,
}: InventoryFilterControlsProps) {
  return (
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
  );
}
