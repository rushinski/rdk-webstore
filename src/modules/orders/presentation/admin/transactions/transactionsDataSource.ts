import { logError } from "@/lib/utils/log";

import {
  createEmptyTabCounts,
  PAGE_SIZE,
  TRANSACTION_TABS,
  type TabKey,
  type TransactionOrder,
} from "@/modules/orders/presentation/admin/transactions/useAdminTransactionsData";

function normalizeTransactionOrder(input: unknown): TransactionOrder | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  return input as TransactionOrder;
}

export function buildTransactionQueryParams(
  tab: (typeof TRANSACTION_TABS)[number],
  page: number,
  extra?: Record<string, string>,
) {
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
}

export async function fetchTransactionOrders(activeTab: TabKey, page: number) {
  const tab =
    TRANSACTION_TABS.find((entry) => entry.key === activeTab) ?? TRANSACTION_TABS[0];
  const params = buildTransactionQueryParams(tab, page);
  const response = await fetch(`/api/admin/orders?${params.toString()}`);
  const data = await response.json();

  return {
    orders: (data.orders ?? [])
      .map((order: unknown) => normalizeTransactionOrder(order))
      .filter((order: TransactionOrder | null): order is TransactionOrder => Boolean(order)),
    totalCount: Number(data.count ?? 0),
  };
}

export async function fetchTransactionCounts() {
  try {
    const results = await Promise.all(
      TRANSACTION_TABS.map(async (tab) => {
        const params = buildTransactionQueryParams(tab, 1, { limit: "1" });
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await response.json();
        return { key: tab.key, count: Number(data.count ?? 0) };
      }),
    );

    const nextCounts = createEmptyTabCounts();
    results.forEach(({ key, count }) => {
      nextCounts[key] = count;
    });

    return nextCounts;
  } catch (error) {
    logError(error, { layer: "frontend", event: "admin_load_transaction_counts" });
    return createEmptyTabCounts();
  }
}
