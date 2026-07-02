"use client";

import { useState } from "react";

import type {
  RefundRequestPayload,
  RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";
import {
  resendOrderEmailRequest,
  refundOrderRequest,
} from "@/components/admin/transactions/order-details/transactionDetailMutationRequests";
import {
  buildRefundableOrder as buildRefundableOrderView,
  buildRefundSuccessToast,
  getTransactionMutationError,
  type TransactionMutationResponse,
} from "@/components/admin/transactions/order-details/transactionDetailMutationView";

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
      const response = await refundOrderRequest(order.id, payload);
      const data = (await response
        .json()
        .catch(() => ({}))) as TransactionMutationResponse;

      if (response.ok && data?.success !== false) {
        setToast(buildRefundSuccessToast(data, payload));
        setRefundOpen(false);
        await loadTransaction();
      } else {
        setToast({
          message: getTransactionMutationError(data, "Refund failed."),
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
      const response = await resendOrderEmailRequest(order.id, emailType);
      const data = (await response
        .json()
        .catch(() => ({}))) as TransactionMutationResponse;

      if (response.ok) {
        setToast({ message: "Email resent successfully.", tone: "success" });
        await loadTransaction();
      } else {
        setToast({
          message: getTransactionMutationError(data, "Failed to resend email."),
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
    return buildRefundableOrderView(order);
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
