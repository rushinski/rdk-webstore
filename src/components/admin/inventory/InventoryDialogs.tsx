"use client";

import { InventoryArchiveDialog } from "@/components/admin/inventory/InventoryArchiveDialog";
import { InventoryDeleteDialogs } from "@/components/admin/inventory/InventoryDeleteDialogs";
import type {
  InventoryDialogsActions,
  InventoryDialogsState,
} from "@/components/admin/inventory/inventoryClientContracts";
import { InventoryProductDetailsModal } from "@/components/admin/inventory/InventoryProductDetailsModal";
import { InventoryRestoreDialog } from "@/components/admin/inventory/InventoryRestoreDialog";
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
      <InventoryDeleteDialogs
        pendingDelete={pendingDelete}
        pendingMassDelete={pendingMassDelete}
        selectedCount={selectedCount}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
        onConfirmMassDelete={onConfirmMassDelete}
        onCancelMassDelete={onCancelMassDelete}
      />
      <InventoryArchiveDialog
        pendingArchive={pendingArchive}
        selectedCount={selectedCount}
        onConfirm={onConfirmArchive}
        onCancel={onCancelArchive}
      />
      <InventoryRestoreDialog
        pendingRestore={pendingRestore}
        selectedCount={selectedCount}
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
