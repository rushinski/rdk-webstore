"use client";

import type { PickupOrder, PickupTabKey } from "@/modules/orders/presentation/admin/pickups/pickupTypes";

type PickupTabDefinition = {
  fulfillmentStatus: string;
  key: PickupTabKey;
  label: string;
};

type PickupOrdersResponse = {
  count?: number;
  error?: string;
  orders?: PickupOrder[];
  success?: boolean;
};

export async function loadPickupCountsRequest(
  pickupTabs: PickupTabDefinition[],
  pickupOrderStatuses: string[],
) {
  return Promise.all(
    pickupTabs.map(async (tab) => {
      const response = await fetch(
        `/api/admin/orders?${buildPickupOrdersParams({
          fulfillmentStatus: tab.fulfillmentStatus,
          page: 1,
          pageSize: 1,
          pickupOrderStatuses,
        }).toString()}`,
      );
      const data = (await response.json()) as PickupOrdersResponse;

      return { key: tab.key, count: Number(data.count ?? 0) };
    }),
  );
}

export async function loadPickupOrdersRequest({
  activeTab,
  currentPage,
  pageSize,
  pickupOrderStatuses,
  pickupTabs,
}: {
  activeTab: PickupTabKey;
  currentPage: number;
  pageSize: number;
  pickupOrderStatuses: string[];
  pickupTabs: PickupTabDefinition[];
}) {
  const tab = pickupTabs.find((entry) => entry.key === activeTab) ?? pickupTabs[0];
  const response = await fetch(
    `/api/admin/orders?${buildPickupOrdersParams({
      fulfillmentStatus: tab.fulfillmentStatus,
      page: currentPage,
      pageSize,
      pickupOrderStatuses,
    }).toString()}`,
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as PickupOrdersResponse;

  return {
    count: typeof data.count === "number" ? data.count : null,
    orders: data.orders || [],
  };
}

export async function markPickupCompleteRequest(orderId: string) {
  const response = await fetch(`/api/admin/orders/${orderId}/pickup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await response.json().catch(() => ({}))) as PickupOrdersResponse;

  if (!response.ok || data.success === false) {
    throw new Error(data.error ?? "Failed to mark pickup complete.");
  }
}

function buildPickupOrdersParams({
  fulfillmentStatus,
  page,
  pageSize,
  pickupOrderStatuses,
}: {
  fulfillmentStatus: string;
  page: number;
  pageSize: number;
  pickupOrderStatuses: string[];
}) {
  const params = new URLSearchParams({
    fulfillment: "pickup",
    fulfillmentStatus,
    limit: String(pageSize),
    page: String(page),
  });

  pickupOrderStatuses.forEach((status) => params.append("status", status));
  return params;
}
