"use client";

import type {
  RefundRequestPayload,
  RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";

import type { Order } from "./types";

export type TransactionMutationResponse = {
  error?: string;
  success?: boolean;
  warning?: string;
};

export function buildRefundSuccessToast(
  data: TransactionMutationResponse,
  payload: RefundRequestPayload,
) {
  const label =
    payload.type === "full"
      ? "Full refund processed."
      : payload.type === "product"
        ? "Product refund processed."
        : "Custom refund processed.";
  const warning = typeof data.warning === "string" ? data.warning : null;

  return {
    message: warning ? `${label} ${warning}` : label,
    tone: warning ? ("info" as const) : ("success" as const),
  };
}

export function getTransactionMutationError(
  data: TransactionMutationResponse,
  fallback: string,
) {
  return data.error ?? fallback;
}

export function buildRefundableOrder(order: Order | null): RefundableOrder | null {
  if (!order) {
    return null;
  }

  return {
    id: order.id,
    total: order.total,
    refund_amount: order.refund_amount,
    items: order.items as unknown as RefundableOrder["items"],
  };
}
