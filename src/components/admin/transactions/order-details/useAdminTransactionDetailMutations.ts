"use client";

import { useState } from "react";

import type {
  RefundRequestPayload,
  RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";

import type { Order } from "./types";

type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
} | null;

type UseAdminTransactionDetailMutationsParams = {
  order: Order | null;
  loadTransaction: () => Promise<void>;
};

export function useAdminTransactionDetailMutations({
  order,
  loadTransaction,
}: UseAdminTransactionDetailMutationsParams) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [isRefundSubmitting, setIsRefundSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const confirmRefund = async (payload: RefundRequestPayload) => {
    if (!order) {
      return;
    }

    setIsRefundSubmitting(true);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success !== false) {
        const label =
          payload.type === "full"
            ? "Full refund processed."
            : payload.type === "product"
              ? "Product refund processed."
              : "Custom refund processed.";
        const warning = typeof data?.warning === "string" ? data.warning : null;

        setToast({
          message: warning ? `${label} ${warning}` : label,
          tone: warning ? "info" : "success",
        });
        setRefundOpen(false);
        await loadTransaction();
      } else {
        setToast({
          message: (data as { error?: string }).error ?? "Refund failed.",
          tone: "error",
        });
      }
    } catch {
      setToast({ message: "Refund failed.", tone: "error" });
    } finally {
      setIsRefundSubmitting(false);
    }
  };

  const handleResendEmail = async (emailType: string) => {
    if (!order || resendingEmail) {
      return;
    }

    setResendingEmail(emailType);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setToast({ message: "Email resent successfully.", tone: "success" });
        await loadTransaction();
      } else {
        setToast({
          message: (data as { error?: string }).error ?? "Failed to resend email.",
          tone: "error",
        });
      }
    } catch {
      setToast({ message: "Failed to resend email.", tone: "error" });
    } finally {
      setResendingEmail(null);
    }
  };

  const buildRefundableOrder = (): RefundableOrder | null => {
    if (!order) {
      return null;
    }

    return {
      id: order.id,
      total: order.total,
      refund_amount: order.refund_amount,
      items: order.items as unknown as RefundableOrder["items"],
    };
  };

  return {
    buildRefundableOrder,
    confirmRefund,
    handleResendEmail,
    isRefundSubmitting,
    refundOpen,
    resendingEmail,
    setRefundOpen,
    setToast,
    toast,
  };
}
