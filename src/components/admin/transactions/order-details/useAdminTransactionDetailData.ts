"use client";

import { useEffect, useState } from "react";

import type {
  CheckoutLog,
  EmailLog,
  Order,
  PaymentEvent,
  PaymentTransaction,
  TrackingEvent,
  TransactionPayload,
} from "./types";

async function fetchTransactionData(orderId: string): Promise<TransactionPayload> {
  const response = await fetch(`/api/admin/transactions/${orderId}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "Failed to load transaction");
  }

  return {
    order: data.order,
    paymentTransaction: data.paymentTransaction ?? null,
    paymentEvents: data.paymentEvents ?? [],
    emailLogs: data.emailLogs ?? [],
    trackingEvents: data.trackingEvents ?? [],
    checkoutLogs: data.checkoutLogs ?? [],
    customer: data.customer ?? null,
  };
}

type UseAdminTransactionDetailDataParams = {
  orderId: string;
};

export function useAdminTransactionDetailData({
  orderId,
}: UseAdminTransactionDetailDataParams) {
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentTx, setPaymentTx] = useState<PaymentTransaction | null>(null);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [checkoutLogs, setCheckoutLogs] = useState<CheckoutLog[]>([]);
  const [customerSummary, setCustomerSummary] =
    useState<TransactionPayload["customer"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransaction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTransactionData(orderId);
      setOrder(data.order);
      setPaymentTx(data.paymentTransaction);
      setPaymentEvents(data.paymentEvents);
      setEmailLogs(data.emailLogs);
      setTrackingEvents(data.trackingEvents);
      setCheckoutLogs(data.checkoutLogs);
      setCustomerSummary(data.customer ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transaction");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTransaction();
  }, [orderId]);

  return {
    checkoutLogs,
    customerSummary,
    emailLogs,
    error,
    isLoading,
    loadTransaction,
    order,
    paymentEvents,
    paymentTx,
    trackingEvents,
  };
}
