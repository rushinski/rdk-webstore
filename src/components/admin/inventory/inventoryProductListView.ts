import type { ProductWithDetails } from "@/types/domain/product";

export type InventoryLiveState = {
  isLive: boolean;
  label: string;
  detail: string | null;
  detailTooltip: string | null;
};

type InventoryProductCardModelParams = {
  expandedVariants: Record<string, boolean>;
  getPrimaryImageUrl: (product: ProductWithDetails) => string | null;
  getProductLiveState: (product: ProductWithDetails) => InventoryLiveState;
  getProductRawTitle: (product: ProductWithDetails) => string;
  getProductTotalStock: (product: ProductWithDetails) => number;
  product: ProductWithDetails;
};

export function formatInventoryVariantMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function buildInventoryProductCardModel({
  expandedVariants,
  getPrimaryImageUrl,
  getProductLiveState,
  getProductRawTitle,
  getProductTotalStock,
  product,
}: InventoryProductCardModelParams) {
  return {
    liveState: getProductLiveState(product),
    primaryImageUrl: getPrimaryImageUrl(product),
    rawTitle: getProductRawTitle(product),
    totalStock: getProductTotalStock(product),
    variantCount: product.variants.length,
    variantsOpen: expandedVariants[product.id] ?? false,
  };
}
