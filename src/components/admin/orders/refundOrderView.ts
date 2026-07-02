import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";

export const toRefundCents = (value: number) => Math.max(0, Math.round(value * 100));
export const fromRefundCents = (value: number) => value / 100;

export const formatRefundMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export const getRefundItemTitle = (item: AdminOrderItem) =>
  item.product_name ?? item.product?.name ?? "Item";

export const getRefundItemImage = (item: AdminOrderItem) => {
  const images = item.product?.images ?? [];
  const primary = images.find((entry) => entry.is_primary) ?? images[0];
  return primary?.url ?? "/images/rdk-logo.png";
};
