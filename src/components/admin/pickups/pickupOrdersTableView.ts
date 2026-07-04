import {
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/modules/orders/presentation/admin/order-item-details";
import { getOrderNetProfitDollars } from "@/lib/orders/metrics";

import type { PickupOrder, PickupOrderItem } from "./pickupTypes";

type PickupOrderRowModelParams = {
  activeTab: "pending" | "completed";
  expandedDetails: Record<string, boolean>;
  expandedOrders: Record<string, boolean>;
  getCustomerEmail: (order: PickupOrder) => string;
  getCustomerName: (order: PickupOrder) => string;
  markingId: string | null;
  order: PickupOrder;
};

export function buildPickupOrderRowModel({
  activeTab,
  expandedDetails,
  expandedOrders,
  getCustomerEmail,
  getCustomerName,
  markingId,
  order,
}: PickupOrderRowModelParams) {
  const profit = getOrderNetProfitDollars({
    subtotal: order.subtotal,
    total: order.total,
    refundAmountRaw: order.refund_amount,
    items: order.items,
    resolveUnitCost: (item) =>
      Number(item.unit_cost ?? (item.variant?.unit_cost_cents ?? 0) / 100),
  });
  const createdAt = order.created_at ? new Date(order.created_at) : null;
  const itemCount = (order.items ?? []).reduce(
    (sum: number, item: PickupOrderItem) => sum + Number(item.quantity ?? 0),
    0,
  );

  return {
    createdAt,
    customerEmail: getCustomerEmail(order),
    customerName: getCustomerName(order),
    detailsExpanded: expandedDetails[order.id] ?? false,
    fulfillmentLabel: order.fulfillment === "pickup" ? "Pickup" : "Ship",
    isDisabled:
      activeTab === "completed" ||
      order.fulfillment_status === "picked_up" ||
      markingId === order.id,
    isPickedUp: activeTab === "completed" || order.fulfillment_status === "picked_up",
    itemCount,
    itemsExpanded: expandedOrders[order.id] ?? false,
    profit,
    profitPrefix: profit >= 0 ? "+" : "-",
  };
}

export type PickupOrderRowModel = ReturnType<typeof buildPickupOrderRowModel>;

export function buildPickupOrderItemModel(
  item: PickupOrderItem,
  getOrderTitle: (item: PickupOrderItem) => string,
  getPrimaryImage: (item: PickupOrderItem) => string,
) {
  const itemFinancials = getOrderItemFinancials(item as AdminOrderItem);

  return {
    formattedLineTotal: `$${Number(item.line_total ?? 0).toFixed(2)}`,
    formattedUnitPrice: `$${itemFinancials.unitPrice.toFixed(2)}`,
    formattedUnitProfit: `${itemFinancials.unitProfit >= 0 ? "+" : "-"}$${Math.abs(itemFinancials.unitProfit).toFixed(2)}`,
    imageUrl: getPrimaryImage(item),
    isPositive: itemFinancials.unitProfit >= 0,
    isRefunded: Boolean(item.refunded_at),
    title: getOrderTitle(item),
  };
}
