"use client";

import {
  AdminOrderItemDetailsModal,
  type AdminOrderItem,
} from "@/modules/orders/presentation/admin/order-item-details";
import { Toast } from "@/components/ui/Toast";

type PickupToastState = {
  message: string;
  tone: "success" | "error" | "info";
} | null;

type PickupsFeedbackProps = {
  onCloseItemDetails: () => void;
  onCloseToast: () => void;
  selectedItem: AdminOrderItem | null;
  toast: PickupToastState;
};

export function PickupsFeedback({
  onCloseItemDetails,
  onCloseToast,
  selectedItem,
  toast,
}: PickupsFeedbackProps) {
  return (
    <>
      <AdminOrderItemDetailsModal
        open={Boolean(selectedItem)}
        item={selectedItem}
        onClose={onCloseItemDetails}
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
