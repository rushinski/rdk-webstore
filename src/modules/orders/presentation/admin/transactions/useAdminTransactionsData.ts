"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";
import {
  fetchTransactionCounts,
  fetchTransactionOrders,
} from "@/modules/orders/presentation/admin/transactions/transactionsDataSource";

export type TabKey =
  | "all"
  | "succeeded"
  | "failed"
  | "refunded"
  | "incomplete"
  | "blocked";

type PaymentSummary = {
  card_type?: string | null;
  card_last4?: string | null;
  paymentStatus?: string | null;
} | null;

type OrderShipping = {
  name?: string | null;
};

export type OrderItemSummary = {
  unit_price?: number | null;
  unit_cost?: number | null;
  quantity?: number | null;
  refunded_at?: string | null;
};

export type TransactionOrder = {
  id: string;
  status?: string | null;
  total?: number | null;
  subtotal?: number | null;
  refund_amount?: number | null;
  created_at?: string | null;
  fulfillment?: string | null;
  user_id?: string | null;
  guest_email?: string | null;
  failure_reason?: string | null;
  profiles?: { email?: string | null } | null;
  shipping?: OrderShipping | OrderShipping[] | null;
  shipping_profile_name?: string | null;
  payment?: PaymentSummary | PaymentSummary[];
  items?: OrderItemSummary[] | null;
};

export const PAGE_SIZE = 20;

export const TRANSACTION_TABS: Array<{
  key: TabKey;
  label: string;
  statuses?: string[];
  incomplete?: boolean;
  includeAll?: boolean;
}> = [
  { key: "all", label: "All", includeAll: true },
  { key: "succeeded", label: "Succeeded", statuses: ["paid", "shipped"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
  {
    key: "refunded",
    label: "Refunded",
    statuses: ["refunded", "partially_refunded", "refund_pending", "refund_failed"],
  },
  { key: "incomplete", label: "Incomplete", incomplete: true },
  { key: "blocked", label: "Blocked", statuses: ["blocked", "review"] },
];

export function createEmptyTabCounts(): Record<TabKey, number> {
  return {
    all: 0,
    succeeded: 0,
    failed: 0,
    refunded: 0,
    incomplete: 0,
    blocked: 0,
  };
}

export function useAdminTransactionsData() {
  const [orders, setOrders] = useState<TransactionOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState<Record<TabKey, number>>(createEmptyTabCounts());
  const [refreshToken] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const data = await fetchTransactionOrders(activeTab, page);
        setOrders(data.orders);
        setTotalCount(data.totalCount);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_transactions" });
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [activeTab, refreshToken, page]);

  useEffect(() => {
    const loadCounts = async () => {
      setCounts(await fetchTransactionCounts());
    };

    void loadCounts();
  }, [refreshToken]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return {
    activeTab,
    counts,
    isLoading,
    orders,
    page,
    setActiveTab,
    setPage,
    totalPages,
  };
}
