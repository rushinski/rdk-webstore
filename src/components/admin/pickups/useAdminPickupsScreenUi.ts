"use client";

import { useState } from "react";

import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import type { PickupOrderItem } from "@/components/admin/pickups/pickupTypes";

export function useAdminPickupsScreenUi() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<PickupOrderItem | null>(null);

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

  const openItemDetails = (item: PickupOrderItem) => {
    setSelectedItem(item);
  };

  const closeItemDetails = () => {
    setSelectedItem(null);
  };

  return {
    closeItemDetails,
    expandedDetails,
    expandedOrders,
    openItemDetails,
    searchQuery,
    selectedItem: selectedItem as AdminOrderItem | null,
    setSearchQuery,
    toggleOrderDetails,
    toggleOrderExpansion,
    toggleOrderItems,
  };
}
