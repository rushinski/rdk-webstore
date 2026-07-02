"use client";

import {
  AdminOrderItemDetailsModal,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { CreateLabelForm } from "@/components/admin/shipping/CreateLabelForm";
import { OriginModal } from "@/components/admin/shipping/OriginModal";
import type { ShippingOrder } from "@/components/admin/shipping/shippingTypes";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ShippingOrigin } from "@/types/domain/shipping";

type LabelPackageDefaults = {
  weight: number;
  length: number;
  width: number;
  height: number;
} | null;

type ShippingDialogsProps = {
  confirmMarkShipped: ShippingOrder | null;
  emptyOrigin: ShippingOrigin;
  labelModalDefaults: LabelPackageDefaults;
  labelOrder: ShippingOrder | null;
  onCloseDetails: () => void;
  onCloseLabelForm: () => void;
  onCloseMarkShippedDialog: () => void;
  onCloseOriginModal: () => void;
  onConfirmMarkShipped: () => void;
  onLabelSuccess: () => void;
  onOriginChange: (field: keyof ShippingOrigin, value: string) => void;
  onSaveOrigin: () => void;
  originAddress: ShippingOrigin | null;
  originError: string;
  originFieldErrors: Partial<Record<keyof ShippingOrigin, string>>;
  originLine: string | null;
  originMessage: string;
  originModalOpen: boolean;
  savingOrigin: boolean;
  selectedItem: AdminOrderItem | null;
};

export function ShippingDialogs({
  confirmMarkShipped,
  emptyOrigin,
  labelModalDefaults,
  labelOrder,
  onCloseDetails,
  onCloseLabelForm,
  onCloseMarkShippedDialog,
  onCloseOriginModal,
  onConfirmMarkShipped,
  onLabelSuccess,
  onOriginChange,
  onSaveOrigin,
  originAddress,
  originError,
  originFieldErrors,
  originLine,
  originMessage,
  originModalOpen,
  savingOrigin,
  selectedItem,
}: ShippingDialogsProps) {
  return (
    <>
      <AdminOrderItemDetailsModal
        open={Boolean(selectedItem)}
        item={selectedItem}
        onClose={onCloseDetails}
      />

      <CreateLabelForm
        open={Boolean(labelOrder)}
        order={labelOrder}
        originLine={originLine}
        initialPackage={labelModalDefaults}
        onClose={onCloseLabelForm}
        onSuccess={onLabelSuccess}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmMarkShipped)}
        title="Mark as shipped manually?"
        description="Important: This should only be used if the carrier hasn't scanned the package yet. Normally, Shippo automatically updates tracking status and sends customer emails when the carrier scans the package. Using this button will manually update the status without waiting for carrier confirmation."
        confirmLabel="Mark shipped anyway"
        onConfirm={onConfirmMarkShipped}
        onCancel={onCloseMarkShippedDialog}
      />

      <OriginModal
        open={originModalOpen}
        originAddress={originAddress}
        emptyOrigin={emptyOrigin}
        originError={originError}
        originMessage={originMessage}
        originFieldErrors={originFieldErrors}
        savingOrigin={savingOrigin}
        onClose={onCloseOriginModal}
        onChange={onOriginChange}
        onSave={onSaveOrigin}
      />
    </>
  );
}
