"use client";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { InventoryClientContent } from "@/modules/catalog/presentation/admin/inventory/InventoryClientContent";
import { InventoryClientHeaderActions } from "@/modules/catalog/presentation/admin/inventory/InventoryClientHeaderActions";
import { InventoryDialogs } from "@/modules/catalog/presentation/admin/inventory/InventoryDialogs";
import { InventoryPagination } from "@/modules/catalog/presentation/admin/inventory/InventoryPagination";
import { InventoryToolbar } from "@/modules/catalog/presentation/admin/inventory/InventoryToolbar";
import type { InventoryFilters } from "@/modules/catalog/presentation/admin/inventory/inventoryClientData";
import { useInventoryClientController } from "@/modules/catalog/presentation/admin/inventory/useInventoryClientController";
import type { ProductWithDetails } from "@/types/domain/product";

interface InventoryClientProps {
  initialProducts: ProductWithDetails[];
  initialTotal: number;
  initialSkuTotal: number;
  initialInventoryUnitTotal: number;
  initialFilters: InventoryFilters;
}

export function InventoryClient({
  initialProducts,
  initialTotal,
  initialSkuTotal,
  initialInventoryUnitTotal,
  initialFilters,
}: InventoryClientProps) {
  const {
    contentProps,
    dialogsProps,
    exportInventory,
    headerDescription,
    isLoading,
    paginationProps,
    toolbarProps,
  } = useInventoryClientController({
    initialFilters,
    initialInventoryUnitTotal,
    initialProducts,
    initialSkuTotal,
    initialTotal,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        description={headerDescription}
        actions={<InventoryClientHeaderActions onExport={() => void exportInventory()} />}
      />

      <InventoryToolbar {...toolbarProps} />

      <InventoryClientContent {...contentProps} />

      {!isLoading && <InventoryPagination {...paginationProps} />}

      <InventoryDialogs {...dialogsProps} />
    </div>
  );
}
