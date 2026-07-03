// src/components/admin/inventory/InventoryClient.tsx
"use client";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import type { ProductWithDetails } from "@/types/domain/product";
import { InventoryClientContent } from "@/components/admin/inventory/InventoryClientContent";
import { InventoryDialogs } from "@/components/admin/inventory/InventoryDialogs";
import { InventoryPagination } from "@/components/admin/inventory/InventoryPagination";
import { InventoryToolbar } from "@/components/admin/inventory/InventoryToolbar";
import { InventoryClientHeaderActions } from "@/components/admin/inventory/InventoryClientHeaderActions";
import { type InventoryFilters } from "@/components/admin/inventory/inventoryClientData";
import { useInventoryClientController } from "@/components/admin/inventory/useInventoryClientController";

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
  const { contentProps, dialogsProps, exportInventory, headerDescription, isLoading, paginationProps, toolbarProps } =
    useInventoryClientController({
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
