"use client";

import type {
  InventoryDialogsActions,
  InventoryDialogsState,
} from "@/components/admin/inventory/inventoryClientContracts";
import { InventoryProductDetailsModal } from "@/components/admin/inventory/InventoryProductDetailsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
type InventoryDialogsProps = InventoryDialogsState & InventoryDialogsActions;

export function InventoryDialogs({
  detailsSelection,
  pendingDelete,
  pendingMassDelete,
  pendingArchive,
  pendingRestore,
  selectedCount,
  toast,
  onCloseDetails,
  onConfirmDelete,
  onCancelDelete,
  onConfirmMassDelete,
  onCancelMassDelete,
  onConfirmArchive,
  onCancelArchive,
  onConfirmRestore,
  onCancelRestore,
  onCloseToast,
}: InventoryDialogsProps) {
  return (
    <>
      <InventoryProductDetailsModal
        open={Boolean(detailsSelection)}
        product={detailsSelection?.product ?? null}
        variant={detailsSelection?.variant ?? null}
        onClose={onCloseDetails}
      />

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
        onConfirm={onConfirmArchive}
        onCancel={onCancelArchive}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingRestore)}
        title="Unarchive selected products?"
        description={`This will restore ${pendingRestore?.count ?? selectedCount} products to active inventory so they can appear in the normal tabs again.`}
        confirmLabel="Unarchive"
        onConfirm={onConfirmRestore}
        onCancel={onCancelRestore}
      />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={onCloseToast}
      />
    </>
  );
}
