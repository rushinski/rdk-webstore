import type { OrderItem } from "./types";

export function buildTransactionPriceBreakdownItemModel(item: OrderItem) {
  return {
    imageUrl:
      item.product?.images?.find((image) => image.is_primary)?.url ??
      item.product?.images?.[0]?.url ??
      "/images/rdk-logo.png",
    isRefunded: Boolean(item.refunded_at),
    title: item.product_name ?? item.product?.name ?? "Item",
  };
}
