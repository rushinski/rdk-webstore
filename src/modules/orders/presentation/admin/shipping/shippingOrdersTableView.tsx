import {
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/modules/orders/presentation/admin/order-item-details";
import type { ShippingAddress, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder, ShippingOrderItem } from "@/modules/orders/presentation/admin/shipping/shippingTypes";

type ActionNodeParams = {
  actionLinkStyles: string;
  activeTab: TabKey;
  markingShippedId: string | null;
  onCreateLabel: (order: ShippingOrder) => void;
  onMarkShipped: (order: ShippingOrder) => void;
  order: ShippingOrder;
  subtleActionLinkStyles: string;
};

type ShippingOrderRowModelParams = {
  expandedDetails: Record<string, boolean>;
  expandedItems: Record<string, boolean>;
  formatAddress: (address: ShippingAddress | null) => string | null;
  formatPlacedAt: (value?: string | null) => { date: string; time: string };
  getCustomerName: (order: ShippingOrder) => string;
  getTrackingUrl: (
    carrier?: string | null,
    trackingNumber?: string | null,
  ) => string | null;
  order: ShippingOrder;
  resolveShippingAddress: (value: unknown) => ShippingAddress | null;
};

export function buildShippingActionNode({
  actionLinkStyles,
  activeTab,
  markingShippedId,
  onCreateLabel,
  onMarkShipped,
  order,
  subtleActionLinkStyles,
}: ActionNodeParams) {
  if (activeTab === "label") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCreateLabel(order);
        }}
        className={actionLinkStyles}
      >
        Create label
      </button>
    );
  }

  if (activeTab === "ready") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMarkShipped(order);
        }}
        disabled={markingShippedId === order.id}
        className={`${subtleActionLinkStyles} disabled:text-brand-muted`}
      >
        {markingShippedId === order.id ? "Marking..." : "Mark shipped"}
      </button>
    );
  }

  return <span className="text-brand-muted">-</span>;
}

export function buildShippingOrderRowModel({
  expandedDetails,
  expandedItems,
  formatAddress,
  formatPlacedAt,
  getCustomerName,
  getTrackingUrl,
  order,
  resolveShippingAddress,
}: ShippingOrderRowModelParams) {
  const itemCount = (order.items ?? []).reduce(
    (sum: number, item: ShippingOrderItem) => sum + Number(item.quantity ?? 0),
    0,
  );
  const address = resolveShippingAddress(order.shipping);

  return {
    address,
    addressLine: formatAddress(address),
    customerName: getCustomerName(order),
    detailsExpanded: expandedDetails[order.id] ?? false,
    itemCount,
    itemsExpanded: expandedItems[order.id] ?? false,
    labelUrl: order.label_url ?? null,
    placedAt: formatPlacedAt(order.created_at),
    trackingUrl: getTrackingUrl(order.shipping_carrier, order.tracking_number),
  };
}

export type ShippingOrderRowModel = ReturnType<typeof buildShippingOrderRowModel>;

export function buildShippingOrderItemModel(
  item: ShippingOrderItem,
  getPrimaryImage: (item: ShippingOrderItem) => string,
) {
  const itemFinancials = getOrderItemFinancials(item as AdminOrderItem);
  const title = item.product_name ?? item.product?.name ?? "Item";

  return {
    formattedLineTotal: `$${Number(item.line_total ?? 0).toFixed(2)}`,
    formattedUnitPrice: `$${itemFinancials.unitPrice.toFixed(2)}`,
    formattedUnitProfit: `${itemFinancials.unitProfit >= 0 ? "+" : "-"}$${Math.abs(itemFinancials.unitProfit).toFixed(2)}`,
    imageUrl: getPrimaryImage(item),
    isPositive: itemFinancials.unitProfit >= 0,
    isRefunded: Boolean(item.refunded_at),
    title,
  };
}
