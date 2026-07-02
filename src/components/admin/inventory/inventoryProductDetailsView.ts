import type { ProductWithDetails, ProductVariantRow } from "@/types/domain/product";

type InventoryDetailsImage = {
  url: string;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

export function formatInventoryDetailsMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatInventoryDetailsDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInventoryDetailsImages(
  product: ProductWithDetails | null,
): InventoryDetailsImage[] {
  if (!product) {
    return [];
  }

  const available =
    product.images
      ?.filter((image) => Boolean(image.url))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) ?? [];

  if (available.length === 0) {
    return [{ url: "/images/rdk-logo.png", is_primary: true, sort_order: 0 }];
  }

  return available;
}

export function getInventoryProductDetailSummary(variant: ProductVariantRow) {
  return [
    ["Unit Cost", formatInventoryDetailsMoney(variant.unit_cost_cents / 100)],
    ["Sale Price", formatInventoryDetailsMoney(variant.sale_price_cents / 100)],
    ["Size", variant.size_label || "N/A"],
    ["Stock", String(variant.stock ?? 0)],
  ] as const;
}
