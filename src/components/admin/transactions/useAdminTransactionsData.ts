"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";

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
  payrilla_status?: string | null;
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

function createEmptyTabCounts(): Record<TabKey, number> {
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

  const buildParams = (
    tab: (typeof TRANSACTION_TABS)[number],
    extra?: Record<string, string>,
  ) => {
    const params = new URLSearchParams();
    if (tab.statuses) {
      tab.statuses.forEach((status) => params.append("status", status));
    }
    if (tab.incomplete) {
      params.set("incomplete", "true");
    }
    if (tab.includeAll) {
      params.set("includeAll", "true");
    }
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(page));
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    }
    return params;
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    const tab =
      TRANSACTION_TABS.find((entry) => entry.key === activeTab) ?? TRANSACTION_TABS[0];

    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const params = buildParams(tab);
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await response.json();
        setOrders(data.orders ?? []);
        setTotalCount(Number(data.count ?? 0));
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
      try {
        const results = await Promise.all(
          TRANSACTION_TABS.map(async (tab) => {
            const params = buildParams(tab, { limit: "1", page: "1" });
            const response = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await response.json();
            return { key: tab.key, count: Number(data.count ?? 0) };
          }),
        );

        const nextCounts = createEmptyTabCounts();
        results.forEach(({ key, count }) => {
          nextCounts[key] = count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_transaction_counts" });
      }
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
