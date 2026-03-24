// app/admin/transactions/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { logError } from "@/lib/utils/log";

type TabKey = "all" | "succeeded" | "failed" | "refunded" | "incomplete" | "blocked";

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
      return { label: "Succeeded", className: "text-green-400" };
    case "shipped":
      return { label: "Shipped", className: "text-blue-300" };
    case "refunded":
      return { label: "Refunded", className: "text-red-300" };
    case "refund_pending":
      return { label: "Refund pending", className: "text-amber-300" };
    case "refund_failed":
      return { label: "Refund failed", className: "text-rose-300" };
    case "partially_refunded":
      return { label: "Partially refunded", className: "text-amber-300" };
    case "failed":
      return { label: "Failed", className: "text-red-400" };
    case "blocked":
      return { label: "Blocked", className: "text-orange-400" };
    case "review":
      return { label: "Under review", className: "text-yellow-400" };
    case "pending":
      return { label: "Incomplete", className: "text-zinc-400" };
    default:
      return { label: status ?? "Unknown", className: "text-zinc-400" };
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

export default function TransactionsPage() {
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
  const [refreshToken, setRefreshToken] = useState(0);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildParams = (tab: (typeof TRANSACTION_TABS)[number], extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (tab.statuses) {
      tab.statuses.forEach((s) => params.append("status", s));
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
      Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    }
    return params;
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    const tab = TRANSACTION_TABS.find((t) => t.key === activeTab) ?? TRANSACTION_TABS[0];
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
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const nextCounts = { all: 0, succeeded: 0, failed: 0, refunded: 0, incomplete: 0, blocked: 0 };
        results.forEach(({ key, count }) => {
          nextCounts[key as TabKey] = count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_transaction_counts" });
      }
    };
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resolveShipping = (value: unknown): OrderShipping | null => {
    if (!value) return null;
    if (Array.isArray(value)) return (value[0] ?? null) as OrderShipping | null;
    return value as OrderShipping;
  };

  const resolvePayment = (value: unknown): PaymentSummary | null => {
    if (!value) return null;
    if (Array.isArray(value)) return (value[0] ?? null) as PaymentSummary | null;
    return value as PaymentSummary;
  };

  const getCustomerName = (order: TransactionOrder) => {
    const address = resolveShipping(order.shipping);
    return address?.name?.trim() || (order.shipping_profile_name ?? "").trim() || "—";
  };

  const getCustomerEmail = (order: TransactionOrder) => {
    return (
      (order.profiles?.email ?? order.guest_email ?? "").trim() || "—"
    );
  };

  const getPaymentDisplay = (order: TransactionOrder) => {
    const payment = resolvePayment(order.payment);
    if (!payment?.card_type && !payment?.card_last4) return "—";
    const type = payment.card_type ?? "";
    const last4 = payment.card_last4 ? `···· ${payment.card_last4}` : "";
    return [type, last4].filter(Boolean).join(" ");
  };

  const getProfit = (order: TransactionOrder): number | null => {
    const items = order.items;
    if (!items || items.length === 0) return null;
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity ?? 0);
      const price = Number(item.unit_price ?? 0);
      const cost = Number(item.unit_cost ?? 0);
      return sum + (price - cost) * qty;
    }, 0);
  };

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;
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
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let p = start; p <= end; p++) pages.push(p);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
        >
          Previous
        </button>
        {start > 1 && (
          <button type="button" onClick={() => setPage(1)} className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300">
            1
          </button>
        )}
        {start > 2 && <span className="text-gray-500">...</span>}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            className={`px-3 py-2 rounded-sm border text-sm ${p === page ? "border-red-600 text-white" : "border-zinc-800/70 text-gray-300"}`}
          >
            {p}
          </button>
        ))}
        {end < totalPages - 1 && <span className="text-gray-500">...</span>}
        {end < totalPages && (
          <button type="button" onClick={() => setPage(totalPages)} className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300">
            {totalPages}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
        <p className="text-gray-400">All payment activity</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800/70 flex flex-wrap gap-6">
        {TRANSACTION_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? "text-white border-b-2 border-red-600"
                : "text-gray-400 hover:text-white border-b-2 border-transparent"
            }`}
          >
            {tab.label}
            <span className="text-[11px] px-2 py-0.5 rounded-sm bg-zinc-900 border border-zinc-800/70 text-gray-300">
              {counts[tab.key] > 99 ? "99+" : counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by date, customer, email, or order ID"
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No transactions found.</div>
        ) : (
          <table className="w-full text-[12px] sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800/70 bg-zinc-800">
                <th className="text-left text-gray-400 font-semibold p-3 sm:p-4">Placed At</th>
                <th className="text-left text-gray-400 font-semibold p-3 sm:p-4">Order</th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">Status</th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">Customer</th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">Email</th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">Payment</th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">Fulfillment</th>
                <th className="text-right text-gray-400 font-semibold p-3 sm:p-4">Amount</th>
                <th className="hidden md:table-cell text-right text-gray-400 font-semibold p-3 sm:p-4">Profit</th>
                <th className="text-right text-gray-400 font-semibold p-3 sm:p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusMeta = getStatusMeta(order.status);
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const customerName = getCustomerName(order);
                const customerEmail = getCustomerEmail(order);
                const paymentDisplay = getPaymentDisplay(order);
                const fulfillmentLabel = order.fulfillment === "pickup" ? "Pickup" : "Ship";

                return (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-800/70 hover:bg-zinc-800 transition-colors"
                  >
                    <td className="p-3 sm:p-4 text-gray-400">
                      {createdAt ? (
                        <div className="space-y-0.5">
                          <div>{createdAt.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-white font-mono text-xs">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4">
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                      {customerName}
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                      {customerEmail}
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                      {paymentDisplay}
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                      {fulfillmentLabel}
                    </td>
                    <td className="p-3 sm:p-4 text-right text-white">
                      ${Number(order.total ?? 0).toFixed(2)}
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4 text-right">
                      {(() => {
                        const profit = getProfit(order);
                        if (profit === null) return <span className="text-zinc-600">—</span>;
                        return (
                          <span className={profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {profit >= 0 ? "+" : ""}${Math.abs(profit).toFixed(2)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <Link
                        href={`/admin/transactions/${order.id}`}
                        className="text-sm text-red-400 hover:text-red-300 transition whitespace-nowrap"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-start">{renderPagination()}</div>
      )}
    </div>
  );
}
