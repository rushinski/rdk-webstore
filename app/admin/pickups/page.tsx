// app/admin/pickups/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import {
  AdminOrderItemDetailsModal,
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import {
  getOrderNetProfitDollars,
  getOrderNetRevenueDollars,
} from "@/lib/orders/metrics";
import { logError } from "@/lib/utils/log";
import { Toast } from "@/components/ui/Toast";

type TabKey = "pending" | "completed";

const PAGE_SIZE = 20;
const PICKUP_ORDER_STATUSES = ["paid", "shipped", "partially_refunded"];

const PICKUP_TABS: Array<{
  key: TabKey;
  label: string;
  fulfillmentStatus: string;
}> = [
  { key: "pending", label: "Need Pickup", fulfillmentStatus: "unfulfilled" },
  { key: "completed", label: "Completed", fulfillmentStatus: "picked_up" },
];

type OrderItem = AdminOrderItem;

type OrderProfile = {
  email?: string | null;
};

type PickupOrder = {
  id: string;
  status?: string | null;
  fulfillment?: string | null;
  fulfillment_status?: string | null;
  total?: number | null;
  subtotal?: number | null;
  refund_amount?: number | null;
  created_at?: string | null;
  user_id?: string | null;
  guest_email?: string | null;
  profiles?: OrderProfile | null;
  shipping?: unknown;
  shipping_profile_name?: string | null;
  items?: OrderItem[] | null;
};

export default function PickupsPage() {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({
    pending: 1,
    completed: 1,
  });
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    pending: 0,
    completed: 0,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const currentPage = pageByTab[activeTab];
  const activeCount = counts[activeTab] ?? 0;
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));

  useEffect(() => {
    setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
  }, [activeTab]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const results = await Promise.all(
          PICKUP_TABS.map(async (tab) => {
            const params = new URLSearchParams({
              fulfillment: "pickup",
              fulfillmentStatus: tab.fulfillmentStatus,
              limit: "1",
              page: "1",
            });
            PICKUP_ORDER_STATUSES.forEach((status) => params.append("status", status));
            const response = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await response.json();
            return { key: tab.key, count: Number(data.count ?? 0) };
          }),
        );

        const nextCounts: Record<TabKey, number> = { pending: 0, completed: 0 };
        results.forEach((result) => {
          nextCounts[result.key] = result.count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_pickup_counts" });
      }
    };

    loadCounts();
  }, [refreshToken]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const tab =
          PICKUP_TABS.find((entry) => entry.key === activeTab) ?? PICKUP_TABS[0];
        const params = new URLSearchParams({
          fulfillment: "pickup",
          fulfillmentStatus: tab.fulfillmentStatus,
          limit: String(PAGE_SIZE),
          page: String(currentPage),
        });
        PICKUP_ORDER_STATUSES.forEach((status) => params.append("status", status));
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        setOrders(data.orders || []);
        if (typeof data.count === "number") {
          setCounts((prev) => ({ ...prev, [activeTab]: data.count }));
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_pickup_orders" });
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [activeTab, currentPage, refreshToken]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }));
    }
  }, [currentPage, totalPages, activeTab]);

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

  const getCustomerName = (order: PickupOrder) => {
    const address = resolveShippingAddress(order.shipping);
    const addressName = address?.name?.trim() ?? "";
    if (addressName) {
      return addressName;
    }
    const profileName = (order.shipping_profile_name ?? "").trim();
    return profileName || "-";
  };

  const getCustomerEmail = (order: PickupOrder) => {
    const email = (order.profiles?.email ?? order.guest_email ?? "").trim();
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
        order.status === "partially_refunded" ||
        order.status === "refunded"
      ) {
        totalSales += 1;
      }
      revenue += getOrderNetRevenueDollars(order.total, order.refund_amount);
      profit += getOrderNetProfitDollars({
        subtotal: order.subtotal,
        total: order.total,
        refundAmountRaw: order.refund_amount,
        items: order.items,
        resolveUnitCost: (item) =>
          Number(item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100),
      });
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

  const toggleOrderItems = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedDetails((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleOrderExpansion = (orderId: string) => {
    const nextExpanded = !(
      (expandedOrders[orderId] ?? false) ||
      (expandedDetails[orderId] ?? false)
    );
    setExpandedOrders((prev) => ({ ...prev, [orderId]: nextExpanded }));
    setExpandedDetails((prev) => ({ ...prev, [orderId]: nextExpanded }));
  };

  const openItemDetails = (item: OrderItem) => {
    setSelectedItem(item);
  };

  const handleMarkPickedUp = async (order: PickupOrder) => {
    if (markingId || activeTab !== "pending") {
      return;
    }
    setMarkingId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error ?? "Failed to mark pickup complete.");
      }
      setToast({ message: "Pickup marked complete.", tone: "success" });
      setRefreshToken((token) => token + 1);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to mark pickup complete.";
      setToast({ message, tone: "error" });
    } finally {
      setMarkingId(null);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setPageByTab((prev) => ({
              ...prev,
              [activeTab]: Math.max(1, currentPage - 1),
            }))
          }
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
        >
          Previous
        </button>

        {start > 1 && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }))}
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
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: p }))}
            className={`px-3 py-2 rounded-sm border text-sm ${
              p === currentPage
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
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }))}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
          >
            {totalPages}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            setPageByTab((prev) => ({
              ...prev,
              [activeTab]: Math.min(totalPages, currentPage + 1),
            }))
          }
          disabled={currentPage === totalPages}
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
        <h1 className="text-3xl font-bold text-white mb-2">Pickups</h1>
        <p className="text-gray-400">Track and complete local pickup orders.</p>
      </div>

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
          <div
            className={`text-lg sm:text-3xl font-bold mt-1 sm:mt-2 ${
              summary.profit >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            <span className="sm:hidden">{compactMoney(summary.profit)}</span>
            <span className="hidden sm:inline">${summary.profit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800/70 flex flex-wrap gap-6">
        {PICKUP_TABS.map((tab) => (
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

      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No orders in this queue.</div>
        ) : (
          <table className="w-full text-[12px] sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800/70 bg-zinc-800">
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
                <th className="hidden md:table-cell text-center text-gray-400 font-semibold p-3 sm:p-4">
                  Complete
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const profit = getOrderNetProfitDollars({
                  subtotal: order.subtotal,
                  total: order.total,
                  refundAmountRaw: order.refund_amount,
                  items: order.items,
                  resolveUnitCost: (item) =>
                    Number(item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100),
                });
                const profitPrefix = profit >= 0 ? "+" : "-";
                const profitClass = profit >= 0 ? "text-green-400" : "text-red-400";
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const customerName = getCustomerName(order);
                const customerEmail = getCustomerEmail(order);
                const fulfillmentLabel =
                  order.fulfillment === "pickup" ? "Pickup" : "Ship";
                const itemsExpanded = expandedOrders[order.id] ?? false;
                const detailsExpanded = expandedDetails[order.id] ?? false;
                const colSpan = 9;
                const isPickedUp =
                  activeTab === "completed" || order.fulfillment_status === "picked_up";
                const isDisabled = isPickedUp || markingId === order.id;
                const itemCount = (order.items ?? []).reduce(
                  (sum: number, item: OrderItem) => sum + Number(item.quantity ?? 0),
                  0,
                );

                return (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => toggleOrderExpansion(order.id)}
                      className="cursor-pointer border-b border-zinc-800/70 hover:bg-zinc-800"
                    >
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
                      <td
                        className={`hidden md:table-cell p-3 sm:p-4 text-right ${profitClass}`}
                      >
                        {profitPrefix}${Math.abs(profit).toFixed(2)}
                      </td>
                      <td className="p-3 sm:p-4 text-left md:text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOrderItems(order.id);
                          }}
                          className="hidden md:inline-flex text-sm text-red-400 hover:text-red-300 items-center gap-2"
                        >
                          {itemsExpanded ? "Hide items" : `View items (${itemCount})`}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              itemsExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOrderDetails(order.id);
                          }}
                          className="md:hidden w-full text-[12px] text-red-400 hover:text-red-300 inline-flex items-center justify-start gap-1 leading-none whitespace-nowrap"
                        >
                          {detailsExpanded ? "Hide details" : "View details"}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              detailsExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="hidden md:table-cell p-3 sm:p-4">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            className="rdk-checkbox"
                            checked={isPickedUp}
                            disabled={isDisabled}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => {
                              if (!isPickedUp) {
                                void handleMarkPickedUp(order);
                              }
                            }}
                            aria-label={`Mark order ${order.id} picked up`}
                          />
                        </div>
                      </td>
                    </tr>
                    {itemsExpanded && (
                      <tr className="hidden md:table-row bg-zinc-900/40">
                        <td colSpan={colSpan} className="p-0 border-b border-zinc-800/70">
                          <div className="flex flex-col">
                            {(order.items ?? []).map((item: OrderItem) => {
                              const imageUrl = getPrimaryImage(item);
                              const title = getOrderTitle(item);
                              const itemFinancials = getOrderItemFinancials(item);
                              const isPositive = itemFinancials.unitProfit >= 0;
                              const isRefunded = Boolean(item.refunded_at);

                              return (
                                <div
                                  key={item.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openItemDetails(item);
                                  }}
                                  className={`group relative cursor-pointer px-6 py-4 transition-colors ${
                                    isRefunded
                                      ? "bg-red-950/20 border-y border-red-900/40"
                                      : "hover:bg-zinc-800"
                                  }`}
                                >
                                  {isRefunded && (
                                    <span className="absolute inset-y-0 left-0 w-1 bg-red-500/80" />
                                  )}
                                  <div
                                    className={`flex items-center justify-start gap-8 ${
                                      isRefunded ? "opacity-60" : ""
                                    }`}
                                  >
                                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm border border-zinc-800 bg-black">
                                      <img
                                        src={imageUrl}
                                        alt={title}
                                        className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                                      />
                                    </div>

                                    <div className="w-48 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-gray-500">
                                        Product
                                      </div>
                                      <div
                                        className="truncate text-sm font-semibold text-white"
                                        title={title}
                                      >
                                        {title}
                                      </div>
                                    </div>

                                    <div className="w-28 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-gray-500">
                                        Size
                                      </div>
                                      <div className="text-sm font-medium text-gray-300">
                                        {item.variant?.size_label ?? "N/A"}
                                      </div>
                                    </div>

                                    <div className="w-24 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-gray-500">
                                        Qty
                                      </div>
                                      <div className="text-sm font-medium text-gray-300">
                                        {item.quantity}
                                      </div>
                                    </div>

                                    <div className="w-32 flex-shrink-0 text-left">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-gray-500">
                                        Line Total
                                      </div>
                                      <div className="text-sm font-bold text-white">
                                        ${Number(item.line_total ?? 0).toFixed(2)}
                                      </div>
                                    </div>

                                    <div className="w-32 flex-shrink-0 text-left">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-gray-500">
                                        Profit
                                      </div>
                                      <div
                                        className={`text-sm font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}
                                      >
                                        {isPositive ? "+" : "-"}$
                                        {Math.abs(itemFinancials.unitProfit).toFixed(2)}
                                      </div>
                                    </div>

                                    <div className="w-20 flex-shrink-0">
                                      {isRefunded ? (
                                        <span className="inline-flex items-center rounded-sm border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                                          Refunded
                                        </span>
                                      ) : (
                                        <span className="text-xs font-medium text-red-500 transition-colors group-hover:text-red-400">
                                          Details
                                        </span>
                                      )}
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
                              <span className={profitClass}>
                                {profitPrefix}${Math.abs(profit).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-500">Pickup</span>
                              {isPickedUp ? (
                                <span className="text-white">Completed</span>
                              ) : (
                                <label className="flex items-center gap-2 text-white">
                                  <input
                                    type="checkbox"
                                    className="rdk-checkbox"
                                    checked={false}
                                    disabled={isDisabled}
                                    onChange={() => {
                                      void handleMarkPickedUp(order);
                                    }}
                                    aria-label={`Mark order ${order.id} picked up`}
                                  />
                                  <span className="text-sm text-white">
                                    {markingId === order.id
                                      ? "Marking..."
                                      : "Mark complete"}
                                  </span>
                                </label>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 border-t border-zinc-800/70 pt-4">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                              Items
                            </div>
                            <div className="space-y-2">
                              {(order.items ?? []).map((item: OrderItem) => {
                                const itemFinancials = getOrderItemFinancials(item);
                                const formattedUnitProfit = `${
                                  itemFinancials.unitProfit >= 0 ? "+" : "-"
                                }$${Math.abs(itemFinancials.unitProfit).toFixed(2)}`;
                                const isRefunded = Boolean(item.refunded_at);
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => openItemDetails(item)}
                                    className={`relative flex cursor-pointer items-start gap-3 rounded-sm p-2 text-base transition ${
                                      isRefunded
                                        ? "bg-red-950/20 border border-red-900/40"
                                        : "hover:bg-zinc-800/60"
                                    }`}
                                  >
                                    {isRefunded && (
                                      <span className="absolute inset-y-0 left-0 w-1 rounded-l-sm bg-red-500/80" />
                                    )}
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
                                      <div className="mt-0.5 text-xs text-gray-500">
                                        Price ${itemFinancials.unitPrice.toFixed(2)} -
                                        Profit{" "}
                                        <span
                                          className={
                                            itemFinancials.unitProfit >= 0
                                              ? "text-green-400"
                                              : "text-red-400"
                                          }
                                        >
                                          {formattedUnitProfit}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openItemDetails(item);
                                        }}
                                        className="mt-1 text-xs text-red-400 hover:text-red-300"
                                      >
                                        View more details
                                      </button>
                                    </div>
                                    {isRefunded && (
                                      <div className="absolute right-2 top-2">
                                        <span className="inline-flex items-center rounded-sm border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-300">
                                          Refunded
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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

      <AdminOrderItemDetailsModal
        open={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
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
