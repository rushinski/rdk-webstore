"use client";

import { useEffect, useMemo } from "react";

import { AdminEmptyState } from "@/modules/shared/presentation/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";
import { ShippingDialogs } from "@/modules/orders/presentation/admin/shipping/ShippingDialogs";
import { ShippingOrdersTable } from "@/modules/orders/presentation/admin/shipping/ShippingOrdersTable";
import { ShippingPagination } from "@/modules/orders/presentation/admin/shipping/ShippingPagination";
import { ShippingReadyAlert } from "@/modules/orders/presentation/admin/shipping/ShippingReadyAlert";
import { ShippingTabBar } from "@/modules/orders/presentation/admin/shipping/ShippingTabBar";
import { ShippingOriginBar } from "@/modules/orders/presentation/admin/shipping/ShippingOriginBar";
import { useAdminShippingData } from "@/modules/orders/presentation/admin/shipping/useAdminShippingData";
import { useAdminShippingMutations } from "@/modules/orders/presentation/admin/shipping/useAdminShippingMutations";
import { useAdminShippingScreenUi } from "@/modules/orders/presentation/admin/shipping/useAdminShippingScreenUi";
import {
  EMPTY_SHIPPING_ORIGIN,
  extractShippingOriginErrors,
  SHIPPING_ORDER_STATUSES,
  SHIPPING_PAGE_SIZE,
  SHIPPING_TABS,
  validateShippingOrigin,
} from "@/modules/orders/presentation/admin/shipping/adminShippingScreenView";
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
} from "@/modules/orders/presentation/admin/shipping/shippingView";

export function AdminShippingScreen() {
  const {
    activeTab,
    closeConfirmMarkShipped,
    closeLabelOrder,
    closeOriginModal,
    closeSelectedItem,
    confirmMarkShipped,
    expandedDetails,
    expandedItems,
    labelOrder,
    openItemDetails,
    originModalOpen,
    selectedItem,
    setActiveTab,
    setConfirmMarkShipped,
    setLabelOrder,
    setOriginModalOpen,
    toggleDetails,
    toggleItems,
    toggleOrderExpansion,
  } = useAdminShippingScreenUi();

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
            onOpenItemDetails={openItemDetails}
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
        onCloseDetails={closeSelectedItem}
        onCloseLabelForm={closeLabelOrder}
        onCloseMarkShippedDialog={closeConfirmMarkShipped}
        onCloseOriginModal={closeOriginModal}
        onConfirmMarkShipped={() => {
          if (confirmMarkShipped) {
            void handleMarkShipped(confirmMarkShipped).finally(() =>
              closeConfirmMarkShipped(),
            );
          }
        }}
        onLabelSuccess={handleLabelSuccess}
        onOriginChange={handleOriginChange}
        onSaveOrigin={() => {
          void handleSaveOrigin(closeOriginModal);
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

