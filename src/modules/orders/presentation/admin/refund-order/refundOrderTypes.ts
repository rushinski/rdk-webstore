import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details";

export type RefundRequestPayload =
  | { type: "full" }
  | { type: "product"; itemIds: string[] }
  | { type: "custom"; amount: number };

export type RefundableOrder = {
  id: string;
  total?: number | null;
  refund_amount?: number | null;
  items?: AdminOrderItem[] | null;
};

export type RefundOrderMode = "full" | "product" | "custom";
