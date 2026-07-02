// src/components/admin/pickups/AdminPickupsScreen.tsx
"use client";

import { useMemo } from "react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { PickupOrdersTable } from "@/components/admin/pickups/PickupOrdersTable";
import { PickupsFeedback } from "@/components/admin/pickups/PickupsFeedback";
import { PickupsPagination } from "@/components/admin/pickups/PickupsPagination";
import { PickupsSearchBar } from "@/components/admin/pickups/PickupsSearchBar";
import { PickupsSummaryCards } from "@/components/admin/pickups/PickupsSummaryCards";
import { PickupsTabBar } from "@/components/admin/pickups/PickupsTabBar";
import {
  buildFilteredPickupOrders,
  buildPickupSummary,
  getPickupCustomerEmail,
  getPickupCustomerName,
  getPickupOrderTitle,
  getPickupPrimaryImage,
} from "@/components/admin/pickups/pickupsView";
import { useAdminPickupsData } from "@/components/admin/pickups/useAdminPickupsData";
import { useAdminPickupsScreenUi } from "@/components/admin/pickups/useAdminPickupsScreenUi";

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
  const {
    closeItemDetails,
    expandedDetails,
    expandedOrders,
    openItemDetails,
    searchQuery,
    selectedItem,
    setSearchQuery,
    toggleOrderDetails,
    toggleOrderExpansion,
    toggleOrderItems,
  } = useAdminPickupsScreenUi();
  const summary = useMemo(() => buildPickupSummary(orders), [orders]);

  const filteredOrders = useMemo(
    () => buildFilteredPickupOrders(orders, searchQuery),
    [orders, searchQuery],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pickups"
        description="Track and complete local pickup orders."
      />

      <PickupsSummaryCards summary={summary} />

      <PickupsTabBar activeTab={activeTab} counts={counts} onTabChange={setActiveTab} />

      <PickupsSearchBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

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
              onOpenItemDetails={openItemDetails}
              getCustomerName={getPickupCustomerName}
              getCustomerEmail={getPickupCustomerEmail}
              getOrderTitle={getPickupOrderTitle}
              getPrimaryImage={getPickupPrimaryImage}
            />
          )}
        </div>
      </AdminSectionCard>

      <PickupsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPageForActiveTab}
      />

      <PickupsFeedback
        onCloseItemDetails={closeItemDetails}
        onCloseToast={() => setToast(null)}
        selectedItem={selectedItem}
        toast={toast}
      />
    </div>
  );
}
