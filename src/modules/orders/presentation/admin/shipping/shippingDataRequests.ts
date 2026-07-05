"use client";

import type { ShippingDefault, ShippingOrigin, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder } from "@/modules/orders/presentation/admin/shipping/shippingTypes";

type ShippingTab = {
  key: TabKey;
  label: string;
  status: string;
};

type ShippingOrdersResponse = {
  count?: number;
  orders?: ShippingOrder[];
};

type ShippingCountsResult = Array<{ key: TabKey; count: number }>;

export async function loadShippingDefaultsRequest() {
  const response = await fetch("/api/admin/shipping/defaults", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load shipping defaults");
  }

  const data = await response.json();
  return normalizeShippingDefaults(data.defaults ?? []);
}

export async function loadShippingOriginRequest() {
  const response = await fetch("/api/admin/shipping/origin", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load shipping origin");
  }

  const data = await response.json();
  return (data.origin ?? null) as ShippingOrigin | null;
}

export async function loadShippingCountsRequest(
  tabs: ShippingTab[],
  shippingOrderStatuses: string[],
) {
  const results = await Promise.all(
    tabs.map(async (tab) => {
      const response = await fetch(
        `/api/admin/orders?${buildShippingOrdersParams({
          fulfillmentStatus: tab.status,
          page: 1,
          pageSize: 1,
          shippingOrderStatuses,
        }).toString()}`,
      );
      const data = (await response.json()) as ShippingOrdersResponse;

      return { key: tab.key, count: Number(data.count ?? 0) };
    }),
  );

  return results satisfies ShippingCountsResult;
}

export async function loadShippingOrdersRequest({
  activeTab,
  currentPage,
  pageSize,
  shippingOrderStatuses,
  tabs,
}: {
  activeTab: TabKey;
  currentPage: number;
  pageSize: number;
  shippingOrderStatuses: string[];
  tabs: ShippingTab[];
}) {
  const tab = tabs.find((entry) => entry.key === activeTab) ?? tabs[0];
  const response = await fetch(
    `/api/admin/orders?${buildShippingOrdersParams({
      fulfillmentStatus: tab.status,
      page: currentPage,
      pageSize,
      shippingOrderStatuses,
    }).toString()}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as ShippingOrdersResponse;

  return {
    count: typeof data.count === "number" ? data.count : null,
    orders: data.orders || [],
  };
}

function buildShippingOrdersParams({
  fulfillmentStatus,
  page,
  pageSize,
  shippingOrderStatuses,
}: {
  fulfillmentStatus: string;
  page: number;
  pageSize: number;
  shippingOrderStatuses: string[];
}) {
  const params = new URLSearchParams({
    fulfillment: "ship",
    fulfillmentStatus,
    limit: String(pageSize),
    page: String(page),
  });

  shippingOrderStatuses.forEach((status) => params.append("status", status));
  return params;
}

function normalizeShippingDefaults(defaults: ShippingDefault[]) {
  const defaultsMap: Record<string, ShippingDefault> = {};

  defaults.forEach((entry) => {
    defaultsMap[entry.category] = entry;
  });

  return defaultsMap;
}
