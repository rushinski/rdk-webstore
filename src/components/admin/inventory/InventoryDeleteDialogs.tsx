"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { InventoryDeleteRequestState } from "@/components/admin/inventory/inventoryClientContracts";

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
