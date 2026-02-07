// src/types/domain/checkout.ts

import type { Tables } from "@/types/db/database.types";

export type FulfillmentMethod = "ship" | "pickup";
export type OrderStatus = Tables<"orders">["status"];

/**
 * Supported Stripe payment method types.
 * Direct charges on Connect accounts support all of these
 * when properly configured in the Connect account's dashboard.
 */
export const SUPPORTED_PAYMENT_METHODS = [
  "card",
  "affirm",
  "afterpay_clearpay",
  "klarna",
  "cashapp",
  "amazon_pay",
  "samsung_pay",
  // Google Pay and Apple Pay are handled via the card payment method
  // and the Payment Request Button / Express Checkout Element
] as const;

export type SupportedPaymentMethod = (typeof SUPPORTED_PAYMENT_METHODS)[number];

// ---------- API request/response shapes ----------

export interface CheckoutItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CreatePaymentIntentRequest {
  items: CheckoutItem[];
  fulfillment: FulfillmentMethod;
  idempotencyKey: string;
  guestEmail?: string | null;
  shippingAddress?: ShippingAddressPayload | null;
}

export interface ShippingAddressPayload {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  orderId: string;
  paymentIntentId: string;
  stripeAccountId: string; // needed for Elements on the frontend
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  fulfillment: FulfillmentMethod;
}

export interface UpdateFulfillmentRequest {
  orderId: string;
  fulfillment: FulfillmentMethod;
  shippingAddress?: ShippingAddressPayload | null;
}

export interface UpdateFulfillmentResponse {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  fulfillment: FulfillmentMethod;
}

export interface ConfirmPaymentRequest {
  orderId: string;
  paymentIntentId: string;
  fulfillment?: FulfillmentMethod;
  shippingAddress?: ShippingAddressPayload | null;
}

export interface OrderStatusResponse {
  id: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
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

// ---------- Internal service shapes ----------

export interface ResolvedLineItem {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number; // dollars
  unitCost: number; // dollars
  lineTotal: number; // dollars
  titleDisplay: string;
  brand: string;
  name: string;
  category: string;
}

export interface CheckoutPricing {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  taxCalculationId: string | null;
  customerState: string | null;
}
