import type {
  ShippingAddress,
  ShippingDefault,
  ShippingOrigin,
} from "@/types/domain/shipping";

import type {
  ShippingOrder,
  ShippingOrderItem,
} from "@/modules/orders/presentation/admin/shipping/shippingTypes";

type PackageProfile = {
  weight: number;
  length: number;
  width: number;
  height: number;
  costCents: number;
};

type PackageDefaults = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

export const DEFAULT_PACKAGE: PackageDefaults = {
  weight: 16,
  length: 12,
  width: 12,
  height: 12,
};

export const getTrackingUrl = (
  carrier?: string | null,
  trackingNumber?: string | null,
) => {
  if (!trackingNumber) {
    return null;
  }

  const normalized = (carrier ?? "").toLowerCase();
  const encodedTracking = encodeURIComponent(trackingNumber);

  if (normalized.includes("ups")) {
    return `https://www.ups.com/track?loc=en_US&tracknum=${encodedTracking}`;
  }
  if (normalized.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
  }
  if (normalized.includes("fedex") || normalized.includes("fed ex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
  }
  if (normalized.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodedTracking}`;
  }

  return null;
};

export const resolveShippingAddress = (value: unknown): ShippingAddress | null => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as ShippingAddress | null;
  }
  if (typeof value === "object") {
    return value as ShippingAddress;
  }

  return null;
};

const clean = (value?: string | null) => (value ?? "").trim();

export const formatAddress = (address: ShippingAddress | null) => {
  if (!address) {
    return null;
  }

  const line1 = [clean(address.line1), clean(address.line2)].filter(Boolean).join(", ");
  const line2 = [clean(address.city), clean(address.state), clean(address.postal_code)]
    .filter(Boolean)
    .join(", ");
  const parts = [clean(address.name), line1, line2, clean(address.country)].filter(
    Boolean,
  );

  return parts.join(" - ");
};

export const formatOriginAddress = (origin: ShippingOrigin | null) => {
  if (!origin) {
    return null;
  }

  const line1 = [clean(origin.line1), clean(origin.line2)].filter(Boolean).join(", ");
  const line2 = [clean(origin.city), clean(origin.state), clean(origin.postal_code)]
    .filter(Boolean)
    .join(", ");
  const parts = [
    clean(origin.name),
    clean(origin.company),
    line1,
    line2,
    clean(origin.country),
  ].filter(Boolean);

  return parts.join(" - ");
};

export const formatPlacedAt = (value?: string | null) => {
  if (!value) {
    return { date: "-", time: "" };
  }

  const date = new Date(value);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

export const getCustomerName = (order: ShippingOrder) => {
  const address = resolveShippingAddress(order.shipping);
  const name = address?.name?.trim();
  if (name) {
    return name;
  }

  const profileName = (order.shipping_profile_name ?? "").trim();
  return profileName || "-";
};

export const getPrimaryImage = (item: ShippingOrderItem) => {
  const images = item.product?.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.url ?? "/images/rdk-logo.png";
};

export const buildPackageProfile = (
  order: ShippingOrder,
  shippingDefaults: Record<string, ShippingDefault>,
  fallbackPackage: PackageDefaults = DEFAULT_PACKAGE,
): PackageProfile => {
  const items = order.items ?? [];

  if (items.length === 0) {
    return {
      weight: fallbackPackage.weight,
      length: fallbackPackage.length,
      width: fallbackPackage.width,
      height: fallbackPackage.height,
      costCents: 0,
    };
  }

  let totalWeight = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let maxCost = 0;

  items.forEach((item) => {
    const quantity = Math.max(1, Number(item.quantity ?? 0));
    const category = item.product?.category ?? null;
    const defaults = category ? shippingDefaults[category] : null;
    const weight = Number(defaults?.default_weight_oz ?? fallbackPackage.weight);
    const length = Number(defaults?.default_length_in ?? fallbackPackage.length);
    const width = Number(defaults?.default_width_in ?? fallbackPackage.width);
    const height = Number(defaults?.default_height_in ?? fallbackPackage.height);
    const cost = Number(defaults?.shipping_cost_cents ?? 0);

    totalWeight += weight * quantity;
    maxLength = Math.max(maxLength, length);
    maxWidth = Math.max(maxWidth, width);
    maxHeight = Math.max(maxHeight, height);
    maxCost = Math.max(maxCost, cost);
  });

  return {
    weight: totalWeight > 0 ? totalWeight : fallbackPackage.weight,
    length: maxLength > 0 ? maxLength : fallbackPackage.length,
    width: maxWidth > 0 ? maxWidth : fallbackPackage.width,
    height: maxHeight > 0 ? maxHeight : fallbackPackage.height,
    costCents: maxCost,
  };
};
