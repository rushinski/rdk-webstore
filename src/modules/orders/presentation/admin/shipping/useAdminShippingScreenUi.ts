"use client";

import { useState } from "react";

import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details";
import type {
  ShippingOrder,
  ShippingOrderItem,
} from "@/modules/orders/presentation/admin/shipping/shippingTypes";
import type { TabKey } from "@/types/domain/shipping";

export function useAdminShippingScreenUi() {
  const [activeTab, setActiveTab] = useState<TabKey>("label");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [confirmMarkShipped, setConfirmMarkShipped] = useState<ShippingOrder | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<ShippingOrderItem | null>(null);
  const [originModalOpen, setOriginModalOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState<ShippingOrder | null>(null);

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

  const openItemDetails = (item: ShippingOrderItem) => {
    setSelectedItem(item);
  };

  const closeSelectedItem = () => setSelectedItem(null);
  const closeLabelOrder = () => setLabelOrder(null);
  const closeConfirmMarkShipped = () => setConfirmMarkShipped(null);
  const closeOriginModal = () => setOriginModalOpen(false);

  return {
    activeTab,
    confirmMarkShipped,
    expandedDetails,
    expandedItems,
    labelOrder,
    openItemDetails,
    originModalOpen,
    selectedItem: selectedItem as AdminOrderItem | null,
    setActiveTab,
    setConfirmMarkShipped,
    setLabelOrder,
    setOriginModalOpen,
    toggleDetails,
    toggleItems,
    toggleOrderExpansion,
    closeConfirmMarkShipped,
    closeLabelOrder,
    closeOriginModal,
    closeSelectedItem,
  };
}
