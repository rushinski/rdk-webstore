import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";

export type ShippingOrderItem = AdminOrderItem;

export type ShippingOrder = {
  id: string;
  created_at?: string | null;
  shipping?: unknown;
  user_id?: string | null;
  shipping_profile_name?: string | null;
  items?: ShippingOrderItem[] | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
};
