import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details";
import type { PickupOrderRowModel } from "@/modules/orders/presentation/admin/pickups/pickupOrdersTableView";

import type {
  PickupOrder,
  PickupOrderItem,
} from "@/modules/orders/presentation/admin/pickups/pickupTypes";

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
