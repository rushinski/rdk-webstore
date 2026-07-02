"use client";

import { useEffect, useState } from "react";

import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";

import type { EmailLog, OrderItem } from "./types";

export function getTransactionStatusTone(
  status: string | null | undefined,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "failed" || status === "refund_failed") {
    return "danger";
  }
  if (
    status === "review" ||
    status === "refund_pending" ||
    status === "partially_refunded"
  ) {
    return "warning";
  }
  return "success";
}

export function useAdminTransactionDetailUi() {
  const [emailPreview, setEmailPreview] = useState<EmailLog | null>(null);
  const [selectedPaymentEventId, setSelectedPaymentEventId] = useState<string | null>(
    null,
  );
  const [isPaymentDrawerVisible, setIsPaymentDrawerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminOrderItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedPaymentEventId) {
      setIsPaymentDrawerVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsPaymentDrawerVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedPaymentEventId]);

  useEffect(() => {
    if (!selectedPaymentEventId && !emailPreview) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [emailPreview, selectedPaymentEventId]);

  const closePaymentDrawer = () => {
    setIsPaymentDrawerVisible(false);
    window.setTimeout(() => {
      setSelectedPaymentEventId(null);
    }, 220);
  };

  const openItemModal = (item: OrderItem) => {
    setSelectedItem(item as unknown as AdminOrderItem);
    setItemModalOpen(true);
  };

  const closeItemModal = () => {
    setItemModalOpen(false);
    setSelectedItem(null);
  };

  return {
    closeEmailPreview: () => setEmailPreview(null),
    closeItemModal,
    closePaymentDrawer,
    emailPreview,
    getStatusTone: getTransactionStatusTone,
    isPaymentDrawerVisible,
    itemModalOpen,
    openItemModal,
    selectedItem,
    selectedPaymentEventId,
    setEmailPreview,
    setSelectedPaymentEventId,
  };
}
