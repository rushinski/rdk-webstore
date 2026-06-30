// app/admin/pickups/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import {
  AdminOrderItemDetailsModal,
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
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

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";
const refundedPanelStyles = "border border-red-200 bg-red-50";
const itemLabelStyles = "mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted";
const mobileItemActionStyles = "mt-1 text-xs text-brand-text transition hover:text-black";

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
    item.product_name ?? item.product?.name ?? "Item";

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
          Number(item.unit_cost ?? (item.variant?.unit_cost_cents ?? 0) / 100),
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
          className={paginationButtonStyles}
        >
          Previous
        </button>

        {start > 1 && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }))}
            className={paginationButtonStyles}
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-brand-muted">...</span>}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: p }))}
            className={
              p === currentPage ? paginationCurrentStyles : paginationButtonStyles
            }
          >
            {p}
          </button>
        ))}

        {end < totalPages - 1 && <span className="text-brand-muted">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }))}
            className={paginationButtonStyles}
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
          className={paginationButtonStyles}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pickups"
        description="Track and complete local pickup orders."
      />

      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-6">
        <AdminMetricCard
          label="Total Sales"
          value={
            summary.totalSales > 999
              ? compactNumber.format(summary.totalSales)
              : `${summary.totalSales}`
          }
        />
        <AdminMetricCard
          label="Revenue"
          value={
            summary.revenue > 999
              ? compactMoney(summary.revenue)
              : `$${summary.revenue.toFixed(2)}`
          }
        />
        <div className="border border-brand-border bg-brand-surface p-4 shadow-[0_16px_50px_rgba(17,17,17,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
            Profit
          </div>
          <div
            className={`mt-3 text-3xl font-bold ${
              summary.profit >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {summary.profit > 999
              ? compactMoney(summary.profit)
              : `$${summary.profit.toFixed(2)}`}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-b border-brand-border">
        {PICKUP_TABS.map((tab) => (
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
          placeholder="Search by date, customer, email, or order"
          className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
        />
      </div>

      <AdminSectionCard>
        <div className="overflow-hidden border border-brand-border bg-brand-surface">
          {isLoading ? (
            <AdminEmptyState
              title="Loading Pickup Orders"
              description="Fetching the current queue."
            />
          ) : filteredOrders.length === 0 ? (
            <AdminEmptyState title="No Orders In This Queue" />
          ) : (
            <table className="w-full text-[12px] sm:text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-page">
                  <th className={tableHeaderCellStyles}>Placed At</th>
                  <th className={tableHeaderCellStyles}>Order</th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Customer
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Email
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
                  <th className={`${tableHeaderCellStyles} md:text-right`}>
                    <span className="hidden md:inline">Items</span>
                    <span className="md:hidden">Details</span>
                  </th>
                  <th
                    className={`hidden text-center md:table-cell ${tableHeaderCellStyles}`}
                  >
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
                      Number(
                        item.unit_cost ?? (item.variant?.unit_cost_cents ?? 0) / 100,
                      ),
                  });
                  const profitPrefix = profit >= 0 ? "+" : "-";
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
                        className={rowStyles}
                      >
                        <td className="p-3 text-brand-muted sm:p-4">
                          {createdAt ? (
                            <div className="space-y-1">
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
                        <td className="p-3 text-brand-text sm:p-4">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                          {customerName}
                        </td>
                        <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                          {customerEmail}
                        </td>
                        <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                          {fulfillmentLabel}
                        </td>
                        <td className="p-3 text-right text-brand-text sm:p-4">
                          ${Number(order.total ?? 0).toFixed(2)}
                        </td>
                        <td
                          className={`hidden p-3 text-right sm:p-4 md:table-cell ${
                            profit >= 0 ? "text-emerald-700" : "text-red-700"
                          }`}
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
                            className="hidden items-center gap-2 text-sm text-brand-text transition hover:text-black md:inline-flex"
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
                            className="inline-flex w-full items-center justify-start gap-1 whitespace-nowrap text-[12px] leading-none text-brand-text transition hover:text-black md:hidden"
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
                        <tr className="hidden bg-brand-page md:table-row">
                          <td
                            colSpan={colSpan}
                            className="border-b border-brand-border p-0"
                          >
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
                                        ? refundedPanelStyles
                                        : "hover:bg-brand-surface"
                                    }`}
                                  >
                                    {isRefunded && (
                                      <span className="absolute inset-y-0 left-0 w-1 bg-red-300" />
                                    )}
                                    <div
                                      className={`flex items-center justify-start gap-8 ${
                                        isRefunded ? "opacity-60" : ""
                                      }`}
                                    >
                                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden border border-brand-border bg-brand-page">
                                        <img
                                          src={imageUrl}
                                          alt={title}
                                          className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                                        />
                                      </div>

                                      <div className="w-48 flex-shrink-0">
                                        <div className={itemLabelStyles}>Product</div>
                                        <div
                                          className="truncate text-sm font-semibold text-brand-text"
                                          title={title}
                                        >
                                          {title}
                                        </div>
                                      </div>

                                      <div className="w-28 flex-shrink-0">
                                        <div className={itemLabelStyles}>Size</div>
                                        <div className="text-sm font-medium text-brand-text">
                                          {item.size_label ??
                                            item.variant?.size_label ??
                                            "N/A"}
                                        </div>
                                      </div>

                                      <div className="w-24 flex-shrink-0">
                                        <div className={itemLabelStyles}>Qty</div>
                                        <div className="text-sm font-medium text-brand-text">
                                          {item.quantity}
                                        </div>
                                      </div>

                                      <div className="w-32 flex-shrink-0 text-left">
                                        <div className={itemLabelStyles}>Line Total</div>
                                        <div className="text-sm font-bold text-brand-text">
                                          ${Number(item.line_total ?? 0).toFixed(2)}
                                        </div>
                                      </div>

                                      <div className="w-32 flex-shrink-0 text-left">
                                        <div className={itemLabelStyles}>Profit</div>
                                        <div
                                          className={`text-sm font-bold ${
                                            isPositive
                                              ? "text-emerald-700"
                                              : "text-red-700"
                                          }`}
                                        >
                                          {isPositive ? "+" : "-"}$
                                          {Math.abs(itemFinancials.unitProfit).toFixed(2)}
                                        </div>
                                      </div>

                                      <div className="w-20 flex-shrink-0">
                                        {isRefunded ? (
                                          <AdminStatusBadge tone="danger">
                                            Refunded
                                          </AdminStatusBadge>
                                        ) : (
                                          <span className="text-xs font-medium text-brand-text transition-colors group-hover:text-black">
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
                        <tr className="border-b border-brand-border bg-brand-page md:hidden">
                          <td
                            colSpan={colSpan}
                            className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
                          >
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-brand-muted">Placed</span>
                                <span className="text-brand-text">
                                  {createdAt
                                    ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                    : "-"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-brand-muted">Customer</span>
                                <span className="text-brand-text">{customerName}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-brand-muted">Email</span>
                                <span className="truncate text-brand-text">
                                  {customerEmail}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-brand-muted">Fulfillment</span>
                                <span className="text-brand-text">
                                  {fulfillmentLabel}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-brand-muted">Profit</span>
                                <span
                                  className={
                                    profit >= 0 ? "text-emerald-700" : "text-red-700"
                                  }
                                >
                                  {profitPrefix}${Math.abs(profit).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-brand-muted">Pickup</span>
                                {isPickedUp ? (
                                  <span className="text-brand-text">Completed</span>
                                ) : (
                                  <label className="flex items-center gap-2 text-brand-text">
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
                                    <span className="text-sm text-brand-text">
                                      {markingId === order.id
                                        ? "Marking..."
                                        : "Mark complete"}
                                    </span>
                                  </label>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 border-t border-brand-border pt-4">
                              <div className="mb-2 text-[11px] uppercase tracking-wide text-brand-muted">
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
                                          ? refundedPanelStyles
                                          : "hover:bg-brand-surface"
                                      }`}
                                    >
                                      {isRefunded && (
                                        <span className="absolute inset-y-0 left-0 w-1 rounded-l-sm bg-red-300" />
                                      )}
                                      <img
                                        src={getPrimaryImage(item)}
                                        alt={getOrderTitle(item)}
                                        className="h-14 w-14 flex-shrink-0 border border-brand-border bg-brand-page object-cover"
                                      />
                                      <div className="min-w-0">
                                        <div className="truncate text-brand-text">
                                          {getOrderTitle(item)}
                                        </div>
                                        <div className="text-sm text-brand-muted">
                                          Size{" "}
                                          {item.size_label ??
                                            item.variant?.size_label ??
                                            "N/A"}{" "}
                                          - Qty {item.quantity}
                                        </div>
                                        <div className="mt-0.5 text-sm font-medium text-brand-text">
                                          ${Number(item.line_total ?? 0).toFixed(2)}
                                        </div>
                                        <div className="mt-0.5 text-xs text-brand-muted">
                                          Price ${itemFinancials.unitPrice.toFixed(2)} -
                                          Profit{" "}
                                          <span
                                            className={
                                              itemFinancials.unitProfit >= 0
                                                ? "text-emerald-700"
                                                : "text-red-700"
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
                                          className={mobileItemActionStyles}
                                        >
                                          View more details
                                        </button>
                                      </div>
                                      {isRefunded && (
                                        <div className="absolute right-2 top-2">
                                          <AdminStatusBadge tone="danger">
                                            Refunded
                                          </AdminStatusBadge>
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
      </AdminSectionCard>

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
