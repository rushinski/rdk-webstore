"use client";

import { useEffect, useState } from "react";

import type { PickupOrder, PickupTabKey } from "@/components/admin/pickups/pickupTypes";
import { logError } from "@/lib/utils/log";
import {
  loadPickupCountsRequest,
  loadPickupOrdersRequest,
  markPickupCompleteRequest,
} from "@/components/admin/pickups/pickupDataRequests";

type PickupTabDefinition = {
  fulfillmentStatus: string;
  key: PickupTabKey;
  label: string;
};

export const PAGE_SIZE = 20;
export const PICKUP_ORDER_STATUSES = ["paid", "shipped", "partially_refunded"];
export const PICKUP_TABS: PickupTabDefinition[] = [
  { key: "pending", label: "Need Pickup", fulfillmentStatus: "unfulfilled" },
  { key: "completed", label: "Completed", fulfillmentStatus: "picked_up" },
];

function createEmptyCounts(): Record<PickupTabKey, number> {
  return {
    completed: 0,
    pending: 0,
  };
}

function createInitialPageByTab(): Record<PickupTabKey, number> {
  return {
    completed: 1,
    pending: 1,
  };
}

export function useAdminPickupsData() {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [activeTab, setActiveTab] = useState<PickupTabKey>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [pageByTab, setPageByTab] = useState<Record<PickupTabKey, number>>(
    createInitialPageByTab(),
  );
  const [counts, setCounts] = useState<Record<PickupTabKey, number>>(createEmptyCounts());
  const [refreshToken, setRefreshToken] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);
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
        const results = await loadPickupCountsRequest(PICKUP_TABS, PICKUP_ORDER_STATUSES);

        const nextCounts = createEmptyCounts();
        results.forEach((result) => {
          nextCounts[result.key] = result.count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_pickup_counts" });
      }
    };

    void loadCounts();
  }, [refreshToken]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const data = await loadPickupOrdersRequest({
          activeTab,
          currentPage,
          pageSize: PAGE_SIZE,
          pickupOrderStatuses: PICKUP_ORDER_STATUSES,
          pickupTabs: PICKUP_TABS,
        });
        setOrders(data.orders);
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

    void loadOrders();
  }, [activeTab, currentPage, refreshToken]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }));
    }
  }, [activeTab, currentPage, totalPages]);

  const setPageForActiveTab = (page: number) => {
    setPageByTab((prev) => ({ ...prev, [activeTab]: page }));
  };

  const handleMarkPickedUp = async (order: PickupOrder) => {
    if (markingId || activeTab !== "pending") {
      return;
    }

    setMarkingId(order.id);
    try {
      await markPickupCompleteRequest(order.id);
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

  return {
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
  };
}
