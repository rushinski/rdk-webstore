import type {
  PickupOrder,
  PickupOrderItem,
} from "@/components/admin/pickups/pickupTypes";
import {
  getOrderNetProfitDollars,
  getOrderNetRevenueDollars,
} from "@/lib/orders/metrics";

type PickupShippingAddress = {
  name?: string | null;
};

export function resolvePickupShippingAddress(
  value: unknown,
): PickupShippingAddress | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as PickupShippingAddress | null;
  }
  if (typeof value === "object") {
    return value as PickupShippingAddress;
  }
  return null;
}

export function getPickupCustomerName(order: PickupOrder) {
  const address = resolvePickupShippingAddress(order.shipping);
  const addressName = address?.name?.trim() ?? "";
  if (addressName) {
    return addressName;
  }

  const profileName = (order.shipping_profile_name ?? "").trim();
  return profileName || "-";
}

export function getPickupCustomerEmail(order: PickupOrder) {
  const email = (order.profiles?.email ?? order.guest_email ?? "").trim();
  return email || "-";
}

export function getPickupOrderTitle(item: PickupOrderItem) {
  return item.product_name ?? item.product?.name ?? "Item";
}

export function getPickupPrimaryImage(item: PickupOrderItem) {
  const images = item.product?.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.url ?? "/images/rdk-logo.png";
}

export function buildPickupSummary(orders: PickupOrder[]) {
  let revenue = 0;
  let profit = 0;
  let totalSales = 0;

  orders.forEach((order) => {
    if (
      order.status === "paid" ||
      order.status === "shipped" ||
      order.status === "partially_refunded" ||
      order.status === "refunded"
    ) {
      totalSales += 1;
    }

    revenue += getOrderNetRevenueDollars(order.total, order.refund_amount);
    profit += getOrderNetProfitDollars({
      subtotal: order.subtotal,
      total: order.total,
      refundAmountRaw: order.refund_amount,
      items: order.items,
      resolveUnitCost: (item) =>
        Number(item.unit_cost ?? (item.variant?.unit_cost_cents ?? 0) / 100),
    });
  });

  return { profit, revenue, totalSales };
}

export function buildFilteredPickupOrders(orders: PickupOrder[], searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return orders;
  }

  return orders.filter((order) => {
    const handle = getPickupCustomerName(order).toLowerCase();
    const email = getPickupCustomerEmail(order).toLowerCase();
    const createdAt = order.created_at ? new Date(order.created_at) : null;
    const dateString = createdAt ? createdAt.toLocaleDateString().toLowerCase() : "";
    const timeString = createdAt ? createdAt.toLocaleTimeString().toLowerCase() : "";
    const isoString = createdAt ? createdAt.toISOString().slice(0, 10) : "";
    const orderId = order.id ? String(order.id).toLowerCase() : "";
    const fulfillment = (order.fulfillment ?? "").toString().toLowerCase();

    return (
      handle.includes(query) ||
      email.includes(query) ||
      dateString.includes(query) ||
      timeString.includes(query) ||
      isoString.includes(query) ||
      orderId.includes(query) ||
      fulfillment.includes(query)
    );
  });
}

export function buildPickupPaginationWindow(currentPage: number, totalPages: number) {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return { end, pages, start };
}
