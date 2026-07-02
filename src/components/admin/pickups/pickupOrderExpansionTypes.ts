import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import type { PickupOrderRowModel } from "@/components/admin/pickups/pickupOrdersTableView";

import type { PickupOrder, PickupOrderItem } from "./pickupTypes";

export type PickupOrderExpansionPanelsProps = {
  colSpan: number;
  getOrderTitle: (item: PickupOrderItem) => string;
  getPrimaryImage: (item: PickupOrderItem) => string;
  markingId: string | null;
  onMarkPickedUp: (order: PickupOrder) => void;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  order: PickupOrder;
  rowModel: PickupOrderRowModel;
};
