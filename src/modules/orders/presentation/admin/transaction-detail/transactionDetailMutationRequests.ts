"use client";

import type { RefundRequestPayload } from "@/modules/orders/presentation/admin/refund-order";

export async function refundOrderRequest(orderId: string, payload: RefundRequestPayload) {
  return fetch(`/api/admin/orders/${orderId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function resendOrderEmailRequest(orderId: string, emailType: string) {
  return fetch(`/api/admin/orders/${orderId}/resend-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailType }),
  });
}
