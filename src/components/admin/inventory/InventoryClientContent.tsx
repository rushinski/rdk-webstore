"use client";

import type {
  InventoryClientContentState,
  InventoryProductListContractProps,
} from "@/components/admin/inventory/inventoryClientContracts";
import { InventoryProductList } from "@/components/admin/inventory/InventoryProductList";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type InventoryClientContentProps = InventoryClientContentState &
  Omit<InventoryProductListContractProps, "products">;

export function InventoryClientContent({
  isLoading,
  products,
  ...productListProps
}: InventoryClientContentProps) {
  if (isLoading) {
    return (
      <AdminEmptyState
        title="Loading Inventory"
        description="Fetching products and variants."
      />
    );
  }

  return (
    <AdminSectionCard>
      <InventoryProductList products={products} {...productListProps} />
    </AdminSectionCard>
  );
}
