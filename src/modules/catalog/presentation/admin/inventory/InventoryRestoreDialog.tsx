"use client";

import type { InventoryRestoreRequestState } from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type InventoryRestoreDialogProps = {
  pendingRestore: InventoryRestoreRequestState;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function InventoryRestoreDialog({
  pendingRestore,
  selectedCount,
  onConfirm,
  onCancel,
}: InventoryRestoreDialogProps) {
  return (
    <ConfirmDialog
      isOpen={Boolean(pendingRestore)}
      title="Unarchive selected products?"
      description={`This will restore ${pendingRestore?.count ?? selectedCount} products to active inventory so they can appear in the normal tabs again.`}
      confirmLabel="Unarchive"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
