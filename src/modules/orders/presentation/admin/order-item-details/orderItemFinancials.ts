import type { AdminOrderItemFinancials } from "@/components/admin/orders/orderItemTypes";

import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsTypes";

export const getOrderItemFinancials = (
  item: AdminOrderItem,
): AdminOrderItemFinancials => {
  const quantity = Math.max(1, Number(item.quantity ?? 0));
  const fallbackUnitPrice =
    quantity > 0 ? Number(item.line_total ?? 0) / quantity : Number(item.line_total ?? 0);
  const unitPrice =
    item.unit_price !== null && item.unit_price !== undefined
      ? Number(item.unit_price)
      : item.variant?.sale_price_cents !== null &&
          item.variant?.sale_price_cents !== undefined
        ? Number(item.variant.sale_price_cents) / 100
        : fallbackUnitPrice;

  const unitCost =
    item.unit_cost !== null && item.unit_cost !== undefined
      ? Number(item.unit_cost)
      : item.variant?.unit_cost_cents !== null &&
          item.variant?.unit_cost_cents !== undefined
        ? Number(item.variant.unit_cost_cents) / 100
        : 0;
  const unitProfit = unitPrice - unitCost;

  return { quantity, unitCost, unitPrice, unitProfit };
};
