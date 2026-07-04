"use client";

import type { InventoryArchiveRequestState } from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type InventoryArchiveDialogProps = {
  pendingArchive: InventoryArchiveRequestState;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function InventoryArchiveDialog({
  pendingArchive,
  selectedCount,
  onConfirm,
  onCancel,
}: InventoryArchiveDialogProps) {
  return (
    <ConfirmDialog
      isOpen={Boolean(pendingArchive)}
      title={
        pendingArchive?.mode === "selected"
          ? "Archive selected products?"
          : "Archive product?"
      }
      description={
        pendingArchive?.mode === "selected"
          ? `This will move ${pendingArchive.count ?? selectedCount} products to the Archived tab. This only changes storefront visibility.`
          : pendingArchive?.label
            ? `This will move ${pendingArchive.label} to the Archived tab. This only changes storefront visibility.`
            : undefined
      }
      confirmLabel="Archive"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
