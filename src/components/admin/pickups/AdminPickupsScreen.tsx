// src/components/admin/pickups/AdminPickupsScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  AdminOrderItemDetailsModal,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import {
  buildFilteredPickupOrders,
  buildPickupPaginationWindow,
  buildPickupSummary,
  getPickupCustomerEmail,
  getPickupCustomerName,
  getPickupOrderTitle,
  getPickupPrimaryImage,
} from "@/components/admin/pickups/pickupsView";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { PickupOrdersTable } from "@/components/admin/pickups/PickupOrdersTable";
import {
  PICKUP_TABS,
  useAdminPickupsData,
} from "@/components/admin/pickups/useAdminPickupsData";
import { Toast } from "@/components/ui/Toast";
import type { PickupOrderItem } from "@/components/admin/pickups/pickupTypes";

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
  const {
    activeTab,
    counts,
    currentPage,
    handleMarkPickedUp,
    isLoading,
    markingId,
    orders,
    setActiveTab,
    setPageForActiveTab,
    setToast,
    toast,
    totalPages,
  } = useAdminPickupsData();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const summary = useMemo(() => buildPickupSummary(orders), [orders]);

  const compactNumber = useMemo(
    () =>
      new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }),
    [],
  );

  const compactMoney = (value: number) => `$${compactNumber.format(value)}`;

  const filteredOrders = useMemo(
    () => buildFilteredPickupOrders(orders, searchQuery),
    [orders, searchQuery],
  );

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

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const { end, pages, start } = buildPickupPaginationWindow(currentPage, totalPages);

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPageForActiveTab(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={paginationButtonStyles}
        >
          Previous
        </button>

        {start > 1 && (
          <button
            type="button"
            onClick={() => setPageForActiveTab(1)}
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
            onClick={() => setPageForActiveTab(p)}
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
            onClick={() => setPageForActiveTab(totalPages)}
            className={paginationButtonStyles}
          >
            {totalPages}
          </button>
        )}

        <button
          type="button"
          onClick={() => setPageForActiveTab(Math.min(totalPages, currentPage + 1))}
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
              getCustomerName={getPickupCustomerName}
              getCustomerEmail={getPickupCustomerEmail}
              getOrderTitle={getPickupOrderTitle}
              getPrimaryImage={getPickupPrimaryImage}
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
