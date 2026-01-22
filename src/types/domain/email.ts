// src/lib/email/orders/types.ts
export type OrderItemEmail = {
  title: string;
  sizeLabel?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;

  // NEW (optional): rich product details for emails
  imageUrl?: string | null; // primary image (absolute https URL recommended)
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  sku?: string | null;
};

export type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type OrderConfirmationEmailInput = {
  to: string;
  orderId: string;
  createdAt: string;
  fulfillment: "ship" | "pickup";
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: OrderItemEmail[];
  shippingAddress?: ShippingAddress | null;
  orderUrl?: string | null;
};

export type OrderTrackingEmailBase = {
  to: string;
  orderId: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  orderUrl?: string | null;
};

export type OrderLabelCreatedEmailInput = OrderTrackingEmailBase;
export type OrderInTransitEmailInput = OrderTrackingEmailBase;
export type OrderDeliveredEmailInput = OrderTrackingEmailBase;

export type OrderRefundedEmailInput = {
  to: string;
  orderId: string;
  refundAmount: number;
  orderUrl?: string | null;
};

export type PickupInstructionsEmailInput = {
  to: string;
  orderId: string;
  orderUrl?: string | null;
  instructions?: string[];
  locationSummary?: string | null;
};

export type AdminOrderPlacedEmailInput = {
  to: string;
  orderId: string;
  fulfillment: "ship" | "pickup";
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
  customerEmail?: string | null;
  orderUrl?: string | null;
};
