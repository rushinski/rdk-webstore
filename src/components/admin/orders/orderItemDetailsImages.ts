import type { AdminOrderItemImage } from "@/components/admin/orders/OrderItemDetailsModal";

const FALLBACK_ORDER_ITEM_IMAGE: AdminOrderItemImage = {
  url: "/images/rdk-logo.png",
  is_primary: true,
  sort_order: 0,
};

export function getOrderItemImages(
  images: AdminOrderItemImage[] | null | undefined,
): AdminOrderItemImage[] {
  const normalizedImages = (images ?? []).filter(
    (entry): entry is AdminOrderItemImage => Boolean(entry?.url),
  );

  if (!normalizedImages.length) {
    return [FALLBACK_ORDER_ITEM_IMAGE];
  }

  return [...normalizedImages].sort((left, right) => {
    const leftPrimary = left.is_primary ? 0 : 1;
    const rightPrimary = right.is_primary ? 0 : 1;
    if (leftPrimary !== rightPrimary) {
      return leftPrimary - rightPrimary;
    }
    return Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
  });
}
