import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details";
import type { ShippingAddress, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder, ShippingOrderItem } from "./shippingTypes";

export type ShippingOrdersTableProps = {
  activeTab: TabKey;
  orders: ShippingOrder[];
  expandedItems: Record<string, boolean>;
  expandedDetails: Record<string, boolean>;
  markingShippedId: string | null;
  onToggleItems: (orderId: string) => void;
  onToggleDetails: (orderId: string) => void;
  onToggleOrderExpansion: (orderId: string) => void;
  onCreateLabel: (order: ShippingOrder) => void;
  onMarkShipped: (order: ShippingOrder) => void;
  onViewLabel: (order: ShippingOrder) => void;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  resolveShippingAddress: (value: unknown) => ShippingAddress | null;
  formatAddress: (address: ShippingAddress | null) => string | null;
  getTrackingUrl: (
    carrier?: string | null,
    trackingNumber?: string | null,
  ) => string | null;
  formatPlacedAt: (value?: string | null) => { date: string; time: string };
  getCustomerName: (order: ShippingOrder) => string;
  getPrimaryImage: (item: ShippingOrderItem) => string;
};
