"use client";

import { useEffect, useState } from "react";

import type { PickupOrder, PickupTabKey } from "@/components/admin/pickups/pickupTypes";
import { logError } from "@/lib/utils/log";

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
