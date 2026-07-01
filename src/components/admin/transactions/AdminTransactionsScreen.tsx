// src/components/admin/transactions/AdminTransactionsScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { getOrderNetProfitDollars, shouldShowOrderProfit } from "@/lib/orders/metrics";
import { logError } from "@/lib/utils/log";

type TabKey = "all" | "succeeded" | "failed" | "refunded" | "incomplete" | "blocked";

const PAGE_SIZE = 20;

const TRANSACTION_TABS: Array<{
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

const getStatusMeta = (status: string | null | undefined) => {
  switch (status) {
    case "paid":
      return { label: "Succeeded", tone: "success" as const };
    case "shipped":
      return { label: "Shipped", tone: "neutral" as const };
    case "refunded":
      return { label: "Refunded", tone: "danger" as const };
    case "refund_pending":
      return { label: "Refund pending", tone: "warning" as const };
    case "refund_failed":
      return { label: "Refund failed", tone: "danger" as const };
    case "partially_refunded":
      return { label: "Partially refunded", tone: "warning" as const };
    case "failed":
      return { label: "Failed", tone: "danger" as const };
    case "blocked":
      return { label: "Blocked", tone: "danger" as const };
    case "review":
      return { label: "Under review", tone: "warning" as const };
    case "pending":
      return { label: "Incomplete", tone: "neutral" as const };
    default:
      return { label: status ?? "Unknown", tone: "neutral" as const };
  }
};

type PaymentSummary = {
  card_type?: string | null;
  card_last4?: string | null;
  payrilla_status?: string | null;
} | null;

type OrderShipping = {
  name?: string | null;
};

type OrderItemSummary = {
  unit_price?: number | null;
  unit_cost?: number | null;
  quantity?: number | null;
  refunded_at?: string | null;
};

type TransactionOrder = {
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

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";
const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";
const tabButtonBase =
  "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors";
const tabActiveStyles = "border-brand-text text-brand-text";
const tabInactiveStyles = "border-transparent text-brand-muted hover:text-brand-text";
const tabCountStyles =
  "border border-brand-border bg-brand-page px-2 py-0.5 text-[11px] text-brand-text";
const tableHeaderCellStyles =
  "bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

export function AdminTransactionsScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<TransactionOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    all: 0,
    succeeded: 0,
    failed: 0,
    refunded: 0,
    incomplete: 0,
    blocked: 0,
  });
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
        const nextCounts = {
          all: 0,
          succeeded: 0,
          failed: 0,
          refunded: 0,
          incomplete: 0,
          blocked: 0,
        };
        results.forEach(({ key, count }) => {
          nextCounts[key as TabKey] = count;
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

  const resolveShipping = (value: unknown): OrderShipping | null => {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return (value[0] ?? null) as OrderShipping | null;
    }
    return value as OrderShipping;
  };

  const resolvePayment = (value: unknown): PaymentSummary | null => {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return (value[0] ?? null) as PaymentSummary | null;
    }
    return value as PaymentSummary;
  };

  const getCustomerName = (order: TransactionOrder) =>
    resolveShipping(order.shipping)?.name?.trim() ||
    (order.shipping_profile_name ?? "").trim() ||
    "-";

  const getCustomerEmail = (order: TransactionOrder) =>
    (order.profiles?.email ?? order.guest_email ?? "").trim() || "-";

  const getPaymentDisplay = (order: TransactionOrder) => {
    const payment = resolvePayment(order.payment);
    if (!payment?.card_type && !payment?.card_last4) {
      return "-";
    }
    const type = payment.card_type ?? "";
    const last4 = payment.card_last4 ? `.... ${payment.card_last4}` : "";
    return [type, last4].filter(Boolean).join(" ");
  };

  const getProfit = (order: TransactionOrder): number | null => {
    if (!shouldShowOrderProfit(order.status)) {
      return null;
    }
    const items = order.items;
    if (!items || items.length === 0) {
      return null;
    }
    return getOrderNetProfitDollars({
      subtotal: order.subtotal ?? order.total ?? 0,
      total: order.total ?? 0,
      refundAmountRaw: order.refund_amount ?? 0,
      items,
      resolveUnitCost: (item) => Number(item.unit_cost ?? 0),
    });
  };

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return orders;
    }
    return orders.filter((order) => {
      const name = getCustomerName(order).toLowerCase();
      const email = getCustomerEmail(order).toLowerCase();
      const id = order.id.toLowerCase();
      const fulfillment = (order.fulfillment ?? "").toLowerCase();
      const createdAt = order.created_at ? new Date(order.created_at) : null;
      const dateStr = createdAt ? createdAt.toLocaleDateString().toLowerCase() : "";
      const isoStr = createdAt ? createdAt.toISOString().slice(0, 10) : "";
      return (
        name.includes(query) ||
        email.includes(query) ||
        id.includes(query) ||
        fulfillment.includes(query) ||
        dateStr.includes(query) ||
        isoStr.includes(query)
      );
    });
  }, [orders, searchQuery]);

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let nextPage = start; nextPage <= end; nextPage += 1) {
      pages.push(nextPage);
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={paginationButtonStyles}
        >
          Previous
        </button>
        {start > 1 && (
          <button
            type="button"
            onClick={() => setPage(1)}
            className={paginationButtonStyles}
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-brand-muted">...</span>}
        {pages.map((nextPage) => (
          <button
            key={nextPage}
            type="button"
            onClick={() => setPage(nextPage)}
            className={
              nextPage === page ? paginationCurrentStyles : paginationButtonStyles
            }
          >
            {nextPage}
          </button>
        ))}
        {end < totalPages - 1 && <span className="text-brand-muted">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            className={paginationButtonStyles}
          >
            {totalPages}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={paginationButtonStyles}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Transactions" description="All payment activity" />

      <div className="flex flex-wrap gap-6 border-b border-brand-border">
        {TRANSACTION_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`${tabButtonBase} ${activeTab === tab.key ? tabActiveStyles : tabInactiveStyles}`}
          >
            {tab.label}
            <span className={tabCountStyles}>
              {counts[tab.key] > 99 ? "99+" : counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex max-w-md items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2">
        <Search className="h-4 w-4 text-brand-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by date, customer, fulfillment, or order ID"
          className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
        />
      </div>

      <AdminSectionCard>
        <div className="overflow-hidden border border-brand-border bg-brand-surface">
          {isLoading ? (
            <AdminEmptyState
              title="Loading Transactions"
              description="Fetching payment activity."
            />
          ) : filteredOrders.length === 0 ? (
            <AdminEmptyState title="No Transactions Found" />
          ) : (
            <table className="w-full text-[12px] sm:text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-page">
                  <th className={tableHeaderCellStyles}>Placed At</th>
                  <th className={tableHeaderCellStyles}>Order</th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Status
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Customer
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Payment
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Fulfillment
                  </th>
                  <th className={`${tableHeaderCellStyles} text-right`}>Amount</th>
                  <th
                    className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}
                  >
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusMeta = getStatusMeta(order.status);
                  const createdAt = order.created_at ? new Date(order.created_at) : null;
                  const customerName = getCustomerName(order);
                  const paymentDisplay = getPaymentDisplay(order);
                  const fulfillmentLabel =
                    order.fulfillment === "pickup" ? "Pickup" : "Ship";
                  const orderHref = `/admin/transactions/${order.id}`;
                  const profit = getProfit(order);

                  return (
                    <tr
                      key={order.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`View transaction ${order.id}`}
                      onClick={() => router.push(orderHref)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(orderHref);
                        }
                      }}
                      className="cursor-pointer border-b border-brand-border transition-colors hover:bg-brand-page focus-visible:bg-brand-page focus-visible:outline-none"
                    >
                      <td className="p-3 text-brand-muted sm:p-4">
                        {createdAt ? (
                          <div className="space-y-0.5">
                            <div>{createdAt.toLocaleDateString()}</div>
                            <div className="text-xs text-brand-muted">
                              {createdAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-brand-text sm:p-4">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="hidden p-3 sm:p-4 md:table-cell">
                        <AdminStatusBadge tone={statusMeta.tone}>
                          {statusMeta.label}
                        </AdminStatusBadge>
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {customerName}
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {paymentDisplay}
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {fulfillmentLabel}
                      </td>
                      <td className="p-3 text-right text-brand-text sm:p-4">
                        ${Number(order.total ?? 0).toFixed(2)}
                      </td>
                      <td className="hidden p-3 text-right sm:p-4 md:table-cell">
                        {profit === null ? (
                          <span className="text-brand-muted">-</span>
                        ) : (
                          <span
                            className={profit >= 0 ? "text-emerald-700" : "text-red-700"}
                          >
                            {profit >= 0 ? "+" : ""}${Math.abs(profit).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </AdminSectionCard>

      {!isLoading && totalPages > 1 ? <div>{renderPagination()}</div> : null}
    </div>
  );
}
