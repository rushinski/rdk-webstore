// src/components/admin/pickups/AdminPickupsScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  AdminOrderItemDetailsModal,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { PickupOrdersTable } from "@/components/admin/pickups/PickupOrdersTable";
import {
  getOrderNetProfitDollars,
  getOrderNetRevenueDollars,
} from "@/lib/orders/metrics";
import { logError } from "@/lib/utils/log";
import { Toast } from "@/components/ui/Toast";
import type {
  PickupOrder,
  PickupOrderItem,
  PickupTabKey,
} from "@/components/admin/pickups/pickupTypes";

type TabKey = PickupTabKey;

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

type OrderItem = PickupOrderItem;

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

export function AdminPickupsScreen() {
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
            <PickupOrdersTable
              activeTab={activeTab}
              filteredOrders={filteredOrders}
              expandedOrders={expandedOrders}
              expandedDetails={expandedDetails}
              markingId={markingId}
              onToggleOrderExpansion={toggleOrderExpansion}
              onToggleOrderItems={toggleOrderItems}
              onToggleOrderDetails={toggleOrderDetails}
              onMarkPickedUp={(order) => {
                void handleMarkPickedUp(order);
              }}
              onOpenItemDetails={(item) => openItemDetails(item as AdminOrderItem)}
              getCustomerName={getCustomerName}
              getCustomerEmail={getCustomerEmail}
              getOrderTitle={getOrderTitle}
              getPrimaryImage={getPrimaryImage}
            />
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
