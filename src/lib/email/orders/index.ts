// src/lib/email/orders/index.ts
export { buildOrderConfirmationEmail } from "@/lib/email/orders/confirmation";
export { buildPickupInstructionsEmail } from "@/lib/email/orders/pickup-instructions";
export { buildOrderLabelCreatedEmail } from "@/lib/email/orders/label-created";
export { buildOrderInTransitEmail } from "@/lib/email/orders/in-transit";
export { buildOrderDeliveredEmail } from "@/lib/email/orders/delivered";
export { buildOrderRefundedEmail } from "@/lib/email/orders/refunded";
export type {
  OrderConfirmationEmailInput,
  OrderDeliveredEmailInput,
  OrderInTransitEmailInput,
  OrderLabelCreatedEmailInput,
  OrderRefundedEmailInput,
  OrderItemEmail,
  OrderTrackingEmailBase,
  PickupInstructionsEmailInput,
  ShippingAddress,
} from "@/lib/email/orders/types";
