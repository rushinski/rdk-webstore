"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";
import type { ShippingDefault, ShippingOrigin, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder } from "./shippingTypes";

type ShippingTab = {
  key: TabKey;
  label: string;
  status: string;
};

type UseAdminShippingDataParams = {
  activeTab: TabKey;
  pageSize: number;
  tabs: ShippingTab[];
  shippingOrderStatuses: string[];
};

export function useAdminShippingData({
  activeTab,
  pageSize,
  tabs,
  shippingOrderStatuses,
}: UseAdminShippingDataParams) {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shippingDefaults, setShippingDefaults] = useState<
    Record<string, ShippingDefault>
  >({});
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({
    label: 1,
    ready: 1,
    shipped: 1,
    delivered: 1,
  });
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    label: 0,
    ready: 0,
    shipped: 0,
    delivered: 0,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [originAddress, setOriginAddress] = useState<ShippingOrigin | null>(null);

  const currentPage = pageByTab[activeTab];
  const activeCount = counts[activeTab] ?? 0;
  const totalPages = Math.max(1, Math.ceil(activeCount / pageSize));

  const loadShippingDefaults = async () => {
    try {
      const response = await fetch("/api/admin/shipping/defaults", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load shipping defaults");
      }

      const data = await response.json();
      const defaultsMap: Record<string, ShippingDefault> = {};

      (data.defaults ?? []).forEach((entry: ShippingDefault) => {
        defaultsMap[entry.category] = entry;
      });

      setShippingDefaults(defaultsMap);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_shipping_defaults" });
    }
  };

  const loadOriginAddress = async () => {
    try {
      const response = await fetch("/api/admin/shipping/origin", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load shipping origin");
      }

      const data = await response.json();
      setOriginAddress(data.origin ?? null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_shipping_origin" });
      setOriginAddress(null);
    }
  };

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const results = await Promise.all(
          tabs.map(async (tab) => {
            const params = new URLSearchParams({
              fulfillment: "ship",
              fulfillmentStatus: tab.status,
              limit: "1",
              page: "1",
            });

            shippingOrderStatuses.forEach((status) => params.append("status", status));

            const response = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await response.json();

            return { key: tab.key, count: Number(data.count ?? 0) };
          }),
        );

        setCounts((currentCounts) => {
          const nextCounts = { ...currentCounts };

          results.forEach((result) => {
            nextCounts[result.key] = result.count;
          });

          return nextCounts;
        });
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_shipping_counts" });
      }
    };

    void loadCounts();
  }, [refreshToken, shippingOrderStatuses, tabs]);

  useEffect(() => {
    void loadShippingDefaults();
    void loadOriginAddress();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);

      try {
        const tab = tabs.find((entry) => entry.key === activeTab) ?? tabs[0];
        const params = new URLSearchParams({
          fulfillment: "ship",
          fulfillmentStatus: tab.status,
          limit: String(pageSize),
          page: String(currentPage),
        });

        shippingOrderStatuses.forEach((status) => params.append("status", status));

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
        logError(error, { layer: "frontend", event: "admin_load_shipping_orders" });
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [activeTab, currentPage, pageSize, refreshToken, shippingOrderStatuses, tabs]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }));
    }
  }, [activeTab, currentPage, totalPages]);

  const setPageForActiveTab = (page: number) => {
    setPageByTab((prev) => ({
      ...prev,
      [activeTab]: page,
    }));
  };

  const refreshShippingData = () => {
    setRefreshToken((token) => token + 1);
  };

  return {
    counts,
    currentPage,
    isLoading,
    orders,
    originAddress,
    pageByTab,
    refreshShippingData,
    loadOriginAddress,
    setOriginAddress,
    setPageForActiveTab,
    shippingDefaults,
    totalPages,
  };
}
