"use client";

import { useEffect, useMemo, useState } from "react";

export type CustomerDetail = {
  routeId: string;
  displayId: string;
  kind: "account" | "guest";
  name: string;
  email: string | null;
  phone: string | null;
  customerSince: string | null;
  lastUpdated: string | null;
  billingDetails: string | null;
  totalSpend: number;
  paymentCount: number;
  primaryPaymentMethod: string | null;
};

export type CustomerPayment = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
};

export type CustomerPaymentMethod = {
  id: string;
  label: string;
  lastUsedAt: string;
  expires: string | null;
  customerName: string | null;
  last4: string | null;
  billingAddress: string | null;
  phone: string | null;
  email: string | null;
  origin: string;
  cvcCheck: string | null;
  streetZipCheck: string | null;
};

export type CustomerActivity = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export type CustomerDetailPayload = {
  customer: CustomerDetail;
  payments: CustomerPayment[];
  paymentMethods: CustomerPaymentMethod[];
  activityLog: CustomerActivity[];
};

export function useAdminCustomerDetailData(customerId: string) {
  const [data, setData] = useState<CustomerDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/customers/${customerId}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load customer");
        }

        setData(payload);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load customer",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomer();
  }, [customerId]);

  const insights = useMemo(() => {
    if (!data) {
      return null;
    }

    const successfulPayments = data.payments.filter(
      (payment) => payment.status === "Succeeded" || payment.status === "Refunded",
    ).length;

    return {
      successfulPayments,
      totalPaymentMethods: data.paymentMethods.length,
    };
  }, [data]);

  return {
    data,
    error,
    insights,
    isLoading,
  };
}
