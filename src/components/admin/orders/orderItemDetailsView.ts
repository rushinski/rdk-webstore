import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";

export const formatOrderItemMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export const formatOrderItemDateTime = (value?: string | null) => {
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
};

export const getOrderItemTitle = (item: AdminOrderItem) =>
  item.product_name ?? item.product?.name ?? "Item";

export const getOrderItemTagLabels = (item: AdminOrderItem) =>
  Array.from(
    new Set(
      (item.product?.tags ?? [])
        .map((entry) => entry.tag?.label?.trim())
        .filter((label): label is string => Boolean(label)),
    ),
  );
