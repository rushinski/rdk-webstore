import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import type { ShippingOrderRowModel } from "@/components/admin/shipping/shippingOrdersTableView";

import type { ShippingOrder, ShippingOrderItem } from "./shippingTypes";

export type ShippingOrderExpansionPanelsProps = {
  actionLinkStyles: string;
  actionNode: React.ReactNode;
  colSpan: number;
  getPrimaryImage: (item: ShippingOrderItem) => string;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  onViewLabel: (order: ShippingOrder) => void;
  order: ShippingOrder;
  rowModel: ShippingOrderRowModel;
};
