import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";

export type PickupTabKey = "pending" | "completed";

export type PickupOrderItem = AdminOrderItem;

export type PickupOrderProfile = {
  email?: string | null;
};

export type PickupOrder = {
  id: string;
  status?: string | null;
  fulfillment?: string | null;
  fulfillment_status?: string | null;
  total?: number | null;
  subtotal?: number | null;
  refund_amount?: number | null;
  created_at?: string | null;
  user_id?: string | null;
  guest_email?: string | null;
  profiles?: PickupOrderProfile | null;
  shipping?: unknown;
  shipping_profile_name?: string | null;
  items?: PickupOrderItem[] | null;
};
