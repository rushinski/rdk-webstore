import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details";

import type {
  PickupOrder,
  PickupOrderItem,
  PickupTabKey,
} from "@/modules/orders/presentation/admin/pickups/pickupTypes";

export type PickupOrdersTableProps = {
  activeTab: PickupTabKey;
  filteredOrders: PickupOrder[];
  expandedOrders: Record<string, boolean>;
  expandedDetails: Record<string, boolean>;
  markingId: string | null;
  onToggleOrderExpansion: (orderId: string) => void;
  onToggleOrderItems: (orderId: string) => void;
  onToggleOrderDetails: (orderId: string) => void;
  onMarkPickedUp: (order: PickupOrder) => void;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  getCustomerName: (order: PickupOrder) => string;
  getCustomerEmail: (order: PickupOrder) => string;
  getOrderTitle: (item: PickupOrderItem) => string;
  getPrimaryImage: (item: PickupOrderItem) => string;
};
