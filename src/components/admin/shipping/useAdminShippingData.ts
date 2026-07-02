"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";
import type { ShippingDefault, ShippingOrigin, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder } from "./shippingTypes";
import {
  loadShippingCountsRequest,
  loadShippingDefaultsRequest,
  loadShippingOrdersRequest,
  loadShippingOriginRequest,
} from "./shippingDataRequests";

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
      setShippingDefaults(await loadShippingDefaultsRequest());
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_shipping_defaults" });
    }
  };

  const loadOriginAddress = async () => {
    try {
      setOriginAddress(await loadShippingOriginRequest());
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_shipping_origin" });
      setOriginAddress(null);
    }
  };

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const results = await loadShippingCountsRequest(tabs, shippingOrderStatuses);

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
        const data = await loadShippingOrdersRequest({
          activeTab,
          currentPage,
          pageSize,
          shippingOrderStatuses,
          tabs,
        });
        setOrders(data.orders);

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
