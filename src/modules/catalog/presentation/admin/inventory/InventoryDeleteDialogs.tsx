"use client";

import type { InventoryDeleteRequestState } from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type InventoryDeleteDialogsProps = {
  pendingDelete: InventoryDeleteRequestState;
  pendingMassDelete: boolean;
  selectedCount: number;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmMassDelete: () => void;
  onCancelMassDelete: () => void;
};

export function InventoryDeleteDialogs({
  pendingDelete,
  pendingMassDelete,
  selectedCount,
  onConfirmDelete,
  onCancelDelete,
  onConfirmMassDelete,
  onCancelMassDelete,
}: InventoryDeleteDialogsProps) {
  return (
    <>
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete product?"
        description={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.label} and its variants.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />

      <ConfirmDialog
        isOpen={pendingMassDelete}
        title="Delete selected products?"
        description={`This will permanently remove ${selectedCount} products and their variants.`}
        confirmLabel="Delete all"
        onConfirm={onConfirmMassDelete}
        onCancel={onCancelMassDelete}
      />
    </>
  );
}
