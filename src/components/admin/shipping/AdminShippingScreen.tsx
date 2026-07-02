// src/components/admin/shipping/AdminShippingScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { ShippingDialogs } from "@/components/admin/shipping/ShippingDialogs";
import { ShippingOrdersTable } from "@/components/admin/shipping/ShippingOrdersTable";
import { ShippingPagination } from "@/components/admin/shipping/ShippingPagination";
import { ShippingReadyAlert } from "@/components/admin/shipping/ShippingReadyAlert";
import { ShippingTabBar } from "@/components/admin/shipping/ShippingTabBar";
import { ShippingOriginBar } from "@/components/admin/shipping/ShippingOriginBar";
import { useAdminShippingData } from "@/components/admin/shipping/useAdminShippingData";
import { useAdminShippingMutations } from "@/components/admin/shipping/useAdminShippingMutations";
import {
  EMPTY_SHIPPING_ORIGIN,
  extractShippingOriginErrors,
  SHIPPING_ORDER_STATUSES,
  SHIPPING_PAGE_SIZE,
  SHIPPING_TABS,
  validateShippingOrigin,
} from "@/components/admin/shipping/adminShippingScreenView";
import {
  buildPackageProfile,
  DEFAULT_PACKAGE,
  formatAddress,
  formatOriginAddress,
  formatPlacedAt,
  getCustomerName,
  getPrimaryImage,
  getTrackingUrl,
  resolveShippingAddress,
} from "@/components/admin/shipping/shippingView";
import type { TabKey } from "@/types/domain/shipping";
import type {
  ShippingOrder,
  ShippingOrderItem,
} from "@/components/admin/shipping/shippingTypes";

type OrderItem = ShippingOrderItem;

export function AdminShippingScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("label");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [confirmMarkShipped, setConfirmMarkShipped] = useState<ShippingOrder | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [originModalOpen, setOriginModalOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState<ShippingOrder | null>(null);

  const {
    counts,
    currentPage,
    isLoading,
    orders,
    originAddress,
    refreshShippingData,
    loadOriginAddress,
    setOriginAddress,
    setPageForActiveTab,
    shippingDefaults,
    totalPages,
  } = useAdminShippingData({
    activeTab,
    pageSize: SHIPPING_PAGE_SIZE,
    tabs: SHIPPING_TABS,
    shippingOrderStatuses: SHIPPING_ORDER_STATUSES,
  });

  const {
    handleLabelSuccess,
    handleMarkShipped,
    handleOriginChange,
    handleSaveOrigin,
    markingShippedId,
    originError,
    originFieldErrors,
    originMessage,
    resetOriginFeedback,
    savingOrigin,
    viewLabel,
  } = useAdminShippingMutations({
    emptyOrigin: EMPTY_SHIPPING_ORIGIN,
    originAddress,
    refreshShippingData,
    setActiveTab,
    setLabelOrder,
    setOriginAddress,
    validateOrigin: validateShippingOrigin,
    extractOriginErrors: extractShippingOriginErrors,
  });

  useEffect(() => {
    if (!originModalOpen) {
      return;
    }
    resetOriginFeedback();
    void loadOriginAddress();
  }, [loadOriginAddress, originModalOpen, resetOriginFeedback]);

  const toggleItems = (orderId: string) => {
    setExpandedItems((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleDetails = (orderId: string) => {
    setExpandedDetails((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleOrderExpansion = (orderId: string) => {
    const nextExpanded = !(
      (expandedItems[orderId] ?? false) ||
      (expandedDetails[orderId] ?? false)
    );
    setExpandedItems((prev) => ({ ...prev, [orderId]: nextExpanded }));
    setExpandedDetails((prev) => ({ ...prev, [orderId]: nextExpanded }));
  };

  const openItemDetails = (item: OrderItem) => {
    setSelectedItem(item);
  };

  const originLine = formatOriginAddress(originAddress);

  const labelModalDefaults = useMemo(() => {
    if (!labelOrder) {
      return null;
    }
    return buildPackageProfile(labelOrder, shippingDefaults, DEFAULT_PACKAGE);
  }, [labelOrder, shippingDefaults]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Shipping"
        description="Review, label, and ship your orders."
      />

      {activeTab === "ready" ? <ShippingReadyAlert /> : null}

      <ShippingTabBar
        activeTab={activeTab}
        counts={counts}
        tabs={SHIPPING_TABS.map(({ key, label }) => ({ key, label }))}
        onTabChange={setActiveTab}
      />

      <ShippingOriginBar
        originLine={originLine}
        onChangeOrigin={() => setOriginModalOpen(true)}
      />

      {isLoading ? (
        <AdminEmptyState
          title="Loading Shipping Orders"
          description="Fetching the current queue."
        />
      ) : orders.length === 0 ? (
        <AdminEmptyState title="No Orders In This Queue" />
      ) : (
        <AdminSectionCard>
          <ShippingOrdersTable
            activeTab={activeTab}
            orders={orders}
            expandedItems={expandedItems}
            expandedDetails={expandedDetails}
            markingShippedId={markingShippedId}
            onToggleItems={toggleItems}
            onToggleDetails={toggleDetails}
            onToggleOrderExpansion={toggleOrderExpansion}
            onCreateLabel={setLabelOrder}
            onMarkShipped={setConfirmMarkShipped}
            onViewLabel={viewLabel}
            onOpenItemDetails={(item) => openItemDetails(item as AdminOrderItem)}
            resolveShippingAddress={resolveShippingAddress}
            formatAddress={formatAddress}
            getTrackingUrl={getTrackingUrl}
            formatPlacedAt={formatPlacedAt}
            getCustomerName={getCustomerName}
            getPrimaryImage={getPrimaryImage}
          />
        </AdminSectionCard>
      )}

      <ShippingPagination
        activeTab={activeTab}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPageForActiveTab}
      />

      <ShippingDialogs
        confirmMarkShipped={confirmMarkShipped}
        emptyOrigin={EMPTY_SHIPPING_ORIGIN}
        labelModalDefaults={
          labelModalDefaults
            ? {
                weight: labelModalDefaults.weight,
                length: labelModalDefaults.length,
                width: labelModalDefaults.width,
                height: labelModalDefaults.height,
              }
            : null
        }
        labelOrder={labelOrder}
        onCloseDetails={() => setSelectedItem(null)}
        onCloseLabelForm={() => setLabelOrder(null)}
        onCloseMarkShippedDialog={() => setConfirmMarkShipped(null)}
        onCloseOriginModal={() => setOriginModalOpen(false)}
        onConfirmMarkShipped={() => {
          if (confirmMarkShipped) {
            void handleMarkShipped(confirmMarkShipped).finally(() =>
              setConfirmMarkShipped(null),
            );
          }
        }}
        onLabelSuccess={handleLabelSuccess}
        onOriginChange={handleOriginChange}
        onSaveOrigin={() => {
          void handleSaveOrigin(() => setOriginModalOpen(false));
        }}
        originAddress={originAddress}
        originError={originError}
        originFieldErrors={originFieldErrors}
        originLine={originLine}
        originMessage={originMessage}
        originModalOpen={originModalOpen}
        savingOrigin={savingOrigin}
        selectedItem={selectedItem}
      />
    </div>
  );
}
