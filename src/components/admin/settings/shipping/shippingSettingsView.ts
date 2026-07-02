import {
  defaultPackage,
  type ShippingDefaultValues,
} from "@/components/admin/settings/shipping/shippingSettingsConfig";

export function buildShippingPackageSummary(
  shippingDefaults: Record<string, ShippingDefaultValues>,
  categoryKey: string,
) {
  const data = shippingDefaults[categoryKey] ?? defaultPackage;
  return {
    cost: (data.shipping_cost_cents / 100).toFixed(2),
    height: data.default_height_in,
    length: data.default_length_in,
    weight: data.default_weight_oz,
    width: data.default_width_in,
  };
}
