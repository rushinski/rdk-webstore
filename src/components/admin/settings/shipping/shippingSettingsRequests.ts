"use client";

import {
  defaultPackage,
  type ShippingDefaultValues,
  type ShippingOriginAddress,
} from "@/components/admin/settings/shipping/shippingSettingsConfig";

type ShippingDefaultsApiEntry = {
  category: string;
  shipping_cost_cents?: number;
  default_weight_oz?: number;
  default_length_in?: number;
  default_width_in?: number;
  default_height_in?: number;
};

type LoadShippingSettingsResult = {
  enabledCarriers: string[];
  originAddress: ShippingOriginAddress | null;
  shippingDefaults: Record<string, ShippingDefaultValues>;
};

export async function loadShippingSettingsData() {
  const [defaultsResponse, originResponse, carriersResponse] = await Promise.all([
    fetch("/api/admin/shipping/defaults", { cache: "no-store" }),
    fetch("/api/admin/shipping/origin", { cache: "no-store" }),
    fetch("/api/admin/shipping/carriers", { cache: "no-store" }),
  ]);

  const defaultsData = await defaultsResponse.json();
  const shippingDefaults = buildShippingDefaultsMap(defaultsData.defaults || []);

  const originData = await originResponse.json();
  const carriersData = await carriersResponse.json();

  return {
    enabledCarriers: carriersData.carriers || [],
    originAddress: originData.origin ?? null,
    shippingDefaults,
  } satisfies LoadShippingSettingsResult;
}

export function buildShippingDefaultsPayload(
  shippingDefaults: Record<string, ShippingDefaultValues>,
  shippingCategories: Array<{ key: string }>,
) {
  return shippingCategories.map((category) => ({
    category: category.key,
    shipping_cost_cents: Math.round(
      shippingDefaults[category.key]?.shipping_cost_cents ?? 0,
    ),
    default_weight_oz:
      shippingDefaults[category.key]?.default_weight_oz ??
      defaultPackage.default_weight_oz,
    default_length_in:
      shippingDefaults[category.key]?.default_length_in ??
      defaultPackage.default_length_in,
    default_width_in:
      shippingDefaults[category.key]?.default_width_in ?? defaultPackage.default_width_in,
    default_height_in:
      shippingDefaults[category.key]?.default_height_in ??
      defaultPackage.default_height_in,
  }));
}

export async function saveShippingDefaultsRequest(
  shippingDefaults: Record<string, ShippingDefaultValues>,
  shippingCategories: Array<{ key: string }>,
) {
  return fetch("/api/admin/shipping/defaults", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      defaults: buildShippingDefaultsPayload(shippingDefaults, shippingCategories),
    }),
  });
}

export async function saveShippingOriginRequest(originDraft: ShippingOriginAddress) {
  return fetch("/api/admin/shipping/origin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(originDraft),
  });
}

export async function saveShippingCarriersRequest(enabledCarriers: string[]) {
  return fetch("/api/admin/shipping/carriers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carriers: enabledCarriers }),
  });
}

function buildShippingDefaultsMap(defaults: ShippingDefaultsApiEntry[]) {
  const map: Record<string, ShippingDefaultValues> = {};

  for (const entry of defaults) {
    map[entry.category] = {
      shipping_cost_cents: entry.shipping_cost_cents ?? 0,
      default_weight_oz: entry.default_weight_oz ?? defaultPackage.default_weight_oz,
      default_length_in: entry.default_length_in ?? defaultPackage.default_length_in,
      default_width_in: entry.default_width_in ?? defaultPackage.default_width_in,
      default_height_in: entry.default_height_in ?? defaultPackage.default_height_in,
    };
  }

  return map;
}
