// app/admin/sales/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { logError } from "@/lib/utils/log";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

type TabKey = "paid" | "refunded";

const SALES_TABS: Array<{ key: TabKey; label: string; statuses: string[] }> = [
  { key: "paid", label: "Paid", statuses: ["paid", "shipped"] },
  {
    key: "refunded",
    label: "Refunded",
    statuses: ["refunded", "refund_pending", "refund_failed"],
  },
];

type OrderItemImage = {
  url?: string | null;
  is_primary?: boolean | null;
};

type OrderItem = {
  id: string;
  quantity?: number | null;
  line_total?: number | null;
  unit_cost?: number | null;
  product?: {
    images?: OrderItemImage[] | null;
    title_display?: string | null;
    brand?: string | null;
    name?: string | null;
  } | null;
  variant?: { cost_cents?: number | null; size_label?: string | null } | null;
};

type OrderCustomer = {
  email?: string | null;
};

type OrderProfile = {
  email?: string | null;
};

type SalesOrder = {
  id: string;
  status?: string | null;
  total?: number | null;
  subtotal?: number | null;
  refund_amount?: number | null;
  created_at?: string | null;
  fulfillment?: string | null;
  user_id?: string | null;
  guest_email?: string | null;
  customer?: OrderCustomer | null;
  profiles?: OrderProfile | null;
  shipping?: unknown;
  shipping_profile_name?: string | null;
  items?: OrderItem[] | null;
};

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("paid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundMode, setIsRefundMode] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState<Record<TabKey, number>>({ paid: 0, refunded: 0 });
  const [refreshToken, setRefreshToken] = useState(0);
  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
    setSelectedOrderId(null);
    setIsRefundMode(false);
  }, [activeTab]);

  useEffect(() => {
    setSelectedOrderId(null);
    setIsRefundMode(false);
  }, [page]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const tab = SALES_TABS.find((entry) => entry.key === activeTab) ?? SALES_TABS[0];
        const params = new URLSearchParams();
        tab.statuses.forEach((status) => params.append("status", status));
        params.set("limit", String(PAGE_SIZE));
        params.set("page", String(page));
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalCount(Number(data.count ?? 0));
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_orders" });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [activeTab, refreshToken, page]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const results = await Promise.all(
          SALES_TABS.map(async (tab) => {
            const params = new URLSearchParams();
            tab.statuses.forEach((status) => params.append("status", status));
            params.set("limit", "1");
            params.set("page", "1");
            const response = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await response.json();
            return { key: tab.key, count: Number(data.count ?? 0) };
          }),
        );

        const nextCounts: Record<TabKey, number> = { paid: 0, refunded: 0 };
        results.forEach((result) => {
          nextCounts[result.key] = result.count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_sales_counts" });
      }
    };

    loadCounts();
  }, [refreshToken]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resolveShippingAddress = (value: unknown): { name?: string | null } | null => {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return (value[0] ?? null) as { name?: string | null } | null;
    }
    if (typeof value === "object") {
      return value as { name?: string | null };
    }
    return null;
  };

  const getCustomerName = (order: SalesOrder) => {
    const address = resolveShippingAddress(order.shipping);
    const addressName = address?.name?.trim() ?? "";
    if (addressName) {
      return addressName;
    }
    const profileName = (order.shipping_profile_name ?? "").trim();
    return profileName || "-";
  };

  const getCustomerEmail = (order: SalesOrder) => {
    const email = (
      order.profiles?.email ??
      order.customer?.email ??
      order.guest_email ??
      ""
    ).trim();
    return email || "-";
  };

  const getOrderTitle = (item: OrderItem) =>
    (item.product?.title_display ??
      `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()) ||
    "Item";

  const getPrimaryImage = (item: OrderItem) => {
    const images = item.product?.images ?? [];
    const primary = images.find((img) => img.is_primary) ?? images[0];
    return primary?.url ?? "/images/rdk-logo.png";
  };

  const summary = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let totalSales = 0;

    orders.forEach((order) => {
      if (
        order.status === "paid" ||
        order.status === "shipped" ||
        order.status === "refunded"
      ) {
        totalSales += 1;
      }
      const total = Number(order.total ?? 0);
      const refundAmount = Number(order.refund_amount ?? 0) / 100;
      revenue += total - refundAmount;

      const itemCost = (order.items || []).reduce((sum: number, item: OrderItem) => {
        const unitCost = Number(item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100);
        return sum + unitCost * Number(item.quantity ?? 0);
      }, 0);
      profit += Number(order.subtotal ?? 0) - itemCost - refundAmount;
    });

    return { revenue, profit, totalSales };
  }, [orders]);

  const compactNumber = useMemo(
    () =>
      new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }),
    [],
  );

  const compactMoney = (value: number) => `$${compactNumber.format(value)}`;

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      const handle = getCustomerName(order).toLowerCase();
      const email = getCustomerEmail(order).toLowerCase();
      const createdAt = order.created_at ? new Date(order.created_at) : null;
      const dateString = createdAt ? createdAt.toLocaleDateString().toLowerCase() : "";
      const timeString = createdAt ? createdAt.toLocaleTimeString().toLowerCase() : "";
      const isoString = createdAt ? createdAt.toISOString().slice(0, 10) : "";
      const orderId = order.id ? String(order.id).toLowerCase() : "";
      const fulfillment = (order.fulfillment ?? "").toString().toLowerCase();

      return (
        handle.includes(query) ||
        email.includes(query) ||
        dateString.includes(query) ||
        timeString.includes(query) ||
        isoString.includes(query) ||
        orderId.includes(query) ||
        fulfillment.includes(query)
      );
    });
  }, [orders, searchQuery]);

  const requestSelectedRefund = () => {
    if (!selectedOrderId) {
      return;
    }
    setPendingRefundId(selectedOrderId);
  };

  const confirmRefund = async () => {
    if (!pendingRefundId) {
      return;
    }
    const orderId = pendingRefundId;
    setPendingRefundId(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success !== false) {
        setToast({ message: "Order refunded.", tone: "success" });
        setRefreshToken((prev) => prev + 1);
      } else {
        setToast({ message: data?.error ?? "Refund failed.", tone: "error" });
      }
    } catch {
      setToast({ message: "Refund failed.", tone: "error" });
    }
  };

  const toggleOrderItems = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedDetails((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const cancelRefundMode = () => {
    setIsRefundMode(false);
    setSelectedOrderId(null);
  };

  const hasRefundableOrders =
    activeTab === "paid" &&
    orders.some((order) => order.status === "paid" || order.status === "shipped");

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }

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
          <button
            type="button"
            onClick={() => setPage(1)}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-gray-500">...</span>}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            className={`px-3 py-2 rounded-sm border text-sm ${
              p === page
                ? "border-red-600 text-white"
                : "border-zinc-800/70 text-gray-300"
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages - 1 && <span className="text-gray-500">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
          >
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales</h1>
          <p className="text-gray-400">Track orders and profit</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isRefundMode ? (
            <>
              <button
                type="button"
                onClick={requestSelectedRefund}
                disabled={!selectedOrderId}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-sm text-sm transition"
              >
                Refund selected
              </button>
              <button
                type="button"
                onClick={cancelRefundMode}
                className="bg-zinc-900 text-white px-4 py-2 rounded-sm text-sm border border-zinc-800/70"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsRefundMode(true)}
              disabled={!hasRefundableOrders}
              className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-sm text-sm transition"
            >
              Refund
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-6">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-3 sm:p-6">
          <span className="text-gray-400 text-[11px] sm:text-sm">Total Sales</span>
          <div className="text-lg sm:text-3xl font-bold text-white mt-1 sm:mt-2">
            <span className="sm:hidden">{compactNumber.format(summary.totalSales)}</span>
            <span className="hidden sm:inline">{summary.totalSales}</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-3 sm:p-6">
          <span className="text-gray-400 text-[11px] sm:text-sm">Revenue</span>
          <div className="text-lg sm:text-3xl font-bold text-white mt-1 sm:mt-2">
            <span className="sm:hidden">{compactMoney(summary.revenue)}</span>
            <span className="hidden sm:inline">${summary.revenue.toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-3 sm:p-6">
          <span className="text-gray-400 text-[11px] sm:text-sm">Profit</span>
          <div className="text-lg sm:text-3xl font-bold text-green-400 mt-1 sm:mt-2">
            <span className="sm:hidden">{compactMoney(summary.profit)}</span>
            <span className="hidden sm:inline">${summary.profit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800/70 flex flex-wrap gap-6">
        {SALES_TABS.map((tab) => (
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

      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by date, customer, email, or order"
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>

      {/* Sales List */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-[12px] sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800/70 bg-zinc-800">
                {isRefundMode && (
                  <th className="text-left text-gray-400 font-semibold p-3 sm:p-4">
                    <span className="sr-only">Select</span>
                  </th>
                )}
                <th className="text-left text-gray-400 font-semibold p-3 sm:p-4">
                  Placed At
                </th>
                <th className="text-left text-gray-400 font-semibold p-3 sm:p-4">
                  Order
                </th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">
                  Customer
                </th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">
                  Email
                </th>
                <th className="hidden md:table-cell text-left text-gray-400 font-semibold p-3 sm:p-4">
                  Fulfillment
                </th>
                <th className="text-right text-gray-400 font-semibold p-3 sm:p-4">
                  Amount
                </th>
                <th className="hidden md:table-cell text-right text-gray-400 font-semibold p-3 sm:p-4">
                  Profit
                </th>
                <th className="text-left md:text-right text-gray-400 font-semibold p-3 sm:p-4">
                  <span className="hidden md:inline">Items</span>
                  <span className="md:hidden">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const itemCost = (order.items || []).reduce(
                  (sum: number, item: OrderItem) => {
                    const unitCost = Number(
                      item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100,
                    );
                    return sum + unitCost * Number(item.quantity ?? 0);
                  },
                  0,
                );
                const refundAmount = Number(order.refund_amount ?? 0) / 100;
                const profit = Number(order.subtotal ?? 0) - itemCost - refundAmount;
                const status = order.status ?? "paid";
                const canRefund = status === "paid" || status === "shipped";
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const customerName = getCustomerName(order);
                const customerEmail = getCustomerEmail(order);
                const fulfillmentLabel =
                  order.fulfillment === "pickup" ? "Pickup" : "Ship";
                const itemsExpanded = expandedOrders[order.id] ?? false;
                const detailsExpanded = expandedDetails[order.id] ?? false;
                const colSpan = isRefundMode ? 9 : 8;
                const itemCount = (order.items ?? []).reduce(
                  (sum: number, item: OrderItem) => sum + Number(item.quantity ?? 0),
                  0,
                );

                return (
                  <Fragment key={order.id}>
                    <tr className="border-b border-zinc-800/70 hover:bg-zinc-800">
                      {isRefundMode && (
                        <td className="p-3 sm:p-4">
                          <input
                            type="checkbox"
                            name="refundOrder"
                            className="rdk-checkbox"
                            checked={selectedOrderId === order.id}
                            onChange={() =>
                              setSelectedOrderId((prev) =>
                                prev === order.id ? null : order.id,
                              )
                            }
                            aria-label={`Select order ${order.id}`}
                            disabled={!canRefund}
                          />
                        </td>
                      )}
                      <td className="p-3 sm:p-4 text-gray-400">
                        {createdAt ? (
                          <div className="space-y-1">
                            <div>{createdAt.toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
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
                      <td className="p-3 sm:p-4 text-white">#{order.id.slice(0, 8)}</td>
                      <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                        {customerName}
                      </td>
                      <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                        {customerEmail}
                      </td>
                      <td className="hidden md:table-cell p-3 sm:p-4 text-gray-400">
                        {fulfillmentLabel}
                      </td>
                      <td className="p-3 sm:p-4 text-right text-white">
                        ${Number(order.total ?? 0).toFixed(2)}
                      </td>
                      <td className="hidden md:table-cell p-3 sm:p-4 text-right text-green-400">
                        +${profit.toFixed(2)}
                      </td>
                      <td className="p-3 sm:p-4 text-left md:text-right">
                        <button
                          type="button"
                          onClick={() => toggleOrderItems(order.id)}
                          className="hidden md:inline-flex text-sm text-red-400 hover:text-red-300 items-center gap-2"
                        >
                          {itemsExpanded ? "Hide items" : `View items (${itemCount})`}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${itemsExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleOrderDetails(order.id)}
                          className="md:hidden w-full text-[12px] text-red-400 hover:text-red-300 inline-flex items-center justify-start gap-1 leading-none whitespace-nowrap"
                        >
                          {detailsExpanded ? "Hide details" : "View details"}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </td>
                    </tr>
                    {itemsExpanded && (
                      <tr className="hidden md:table-row border-b border-zinc-800/70 bg-zinc-900/40">
                        <td colSpan={colSpan} className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
                          <div className="flex flex-col gap-3">
                            {(order.items ?? []).map((item: OrderItem) => {
                              const imageUrl = getPrimaryImage(item);
                              const title = getOrderTitle(item);
                              return (
                                <div
                                  key={item.id}
                                  className="flex w-full items-start gap-3 text-base text-gray-400"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={title}
                                    className="h-14 w-14 flex-shrink-0 object-cover border border-zinc-800/70 bg-black"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-white truncate">{title}</div>
                                    <div className="text-sm text-gray-500">
                                      Size {item.variant?.size_label ?? "N/A"} - Qty{" "}
                                      {item.quantity}
                                    </div>
                                    <div className="text-sm font-medium text-white mt-0.5">
                                      ${Number(item.line_total ?? 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    {detailsExpanded && (
                      <tr className="md:hidden border-b border-zinc-800/70 bg-zinc-900/40">
                        <td colSpan={colSpan} className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-500">Placed</span>
                              <span className="text-white">
                                {createdAt
                                  ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-500">Customer</span>
                              <span className="text-white">{customerName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-500">Email</span>
                              <span className="text-white truncate">{customerEmail}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-500">Fulfillment</span>
                              <span className="text-white">{fulfillmentLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-500">Profit</span>
                              <span className="text-green-400">
                                +${profit.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-zinc-800/70 pt-4">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                              Items
                            </div>
                            <div className="flex flex-col gap-2">
                              {(order.items ?? []).map((item: OrderItem) => (
                                <div
                                  key={item.id}
                                  className="flex w-full items-start gap-3 text-base"
                                >
                                  <img
                                    src={getPrimaryImage(item)}
                                    alt={getOrderTitle(item)}
                                    className="h-14 w-14 flex-shrink-0 object-cover border border-zinc-800/70 bg-black"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-white truncate">
                                      {getOrderTitle(item)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Size {item.variant?.size_label ?? "N/A"} - Qty{" "}
                                      {item.quantity}
                                    </div>
                                    <div className="text-sm font-medium text-white mt-0.5">
                                      ${Number(item.line_total ?? 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderPagination()}

      <ConfirmDialog
        isOpen={Boolean(pendingRefundId)}
        title="Refund order?"
        description={
          pendingRefundId
            ? `This will refund order #${pendingRefundId.slice(0, 8)} in full.`
            : undefined
        }
        confirmLabel="Refund"
        onConfirm={() => {
          void confirmRefund();
        }}
        onCancel={() => setPendingRefundId(null)}
      />
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
