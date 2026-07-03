"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";

export type AdminCustomersRow = {
  routeId: string;
  displayId: string;
  kind: "account" | "guest";
  name: string;
  email: string | null;
  primaryPaymentMethod: string | null;
  createdAt: string;
  totalSpend: number;
  paymentCount: number;
};

export function useAdminCustomersData() {
  const [customers, setCustomers] = useState<AdminCustomersRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/customers", { cache: "no-store" });
        const data = await response.json();
        setCustomers(data.customers ?? []);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_customers_load_failed" });
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomers();
  }, []);

  return {
    customers,
    isLoading,
  };
}
