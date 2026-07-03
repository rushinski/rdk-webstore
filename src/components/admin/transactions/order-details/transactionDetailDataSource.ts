import type {
  CheckoutLog,
  EmailLog,
  PaymentEvent,
  PaymentTransaction,
  TrackingEvent,
  TransactionPayload,
} from "@/components/admin/transactions/order-details/types";

export async function fetchTransactionDetailPayload(
  orderId: string,
): Promise<TransactionPayload> {
  const response = await fetch(`/api/admin/transactions/${orderId}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "Failed to load transaction");
  }

  return {
    order: data.order,
    paymentTransaction: (data.paymentTransaction as PaymentTransaction | null) ?? null,
    paymentEvents: (data.paymentEvents ?? []) as PaymentEvent[],
    emailLogs: (data.emailLogs ?? []) as EmailLog[],
    trackingEvents: (data.trackingEvents ?? []) as TrackingEvent[],
    checkoutLogs: (data.checkoutLogs ?? []) as CheckoutLog[],
    customer: data.customer ?? null,
  };
}
