// src/types/views/checkout.ts (CORRECTED)

import type { Tables } from "@/types/database.types";

export type FulfillmentMethod = "ship" | "pickup";
export type OrderStatus = Tables<"orders">["status"];

export interface CheckoutSessionRequest {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  fulfillment: FulfillmentMethod;
  idempotencyKey: string;
  guestEmail?: string;
}

export interface CheckoutSessionResponse {
  url: string;
  orderId: string;
  stripeSessionId: string;
}

export interface OrderStatusResponse {
  id: string;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  fulfillment: FulfillmentMethod;
  updatedAt: string;
  events: Array<{
    type: string;
    message: string | null;
    createdAt: string;
  }>;
  pickupInstructions?: string | null;
  supportEmail: string;
}
