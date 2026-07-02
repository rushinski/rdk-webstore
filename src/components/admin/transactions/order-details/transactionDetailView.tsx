import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { calculateCheckoutDisplayTotals } from "@/lib/checkout/display-pricing";
import { shouldShowOrderProfit } from "@/lib/orders/metrics";
import {
  getEmailTypeMeta,
  getRelatedCheckoutLogs,
} from "@/components/admin/transactions/order-details/transactionEmailView";
import {
  fmtDate,
  getAvsLabel,
  getCvvLabel,
  getEventMeta,
  getNoFraudBadge,
  getOrderStatusMeta,
} from "@/components/admin/transactions/order-details/transactionPaymentView";

import type {
  EmailLog,
  Order,
  PaymentEvent,
  PaymentTransaction,
  SessionEntry,
} from "./types";

const SHIPPING_EMAIL_TYPES = [
  "order_confirmation",
  "label_created",
  "in_transit",
  "delivered",
] as const;
const PICKUP_EMAIL_TYPES = ["order_confirmation", "pickup_instructions"] as const;
const REFUND_EMAIL_TYPE = "refund_notification" as const;

type BuildTransactionDetailViewModelParams = {
  emailLogs: EmailLog[];
  order: Order;
  paymentEvents: PaymentEvent[];
  paymentTx: PaymentTransaction | null;
  selectedPaymentEventId: string | null;
  items: Order["items"];
  getOrderItemFinancials: (item: AdminOrderItem) => {
    quantity: number;
    unitCost: number;
    unitPrice: number;
    unitProfit: number;
  };
};

export function buildTransactionDetailViewModel({
  emailLogs,
  order,
  paymentEvents,
  paymentTx,
  selectedPaymentEventId,
  items,
  getOrderItemFinancials,
}: BuildTransactionDetailViewModelParams) {
  const statusMeta = getOrderStatusMeta(order.status);
  const shippingAddr = Array.isArray(order.shipping_address)
    ? order.shipping_address[0]
    : order.shipping_address;
  const normalizedItems = items ?? [];
  const subtotal = Number(order.subtotal ?? 0);
  const shipping = Number(order.shipping ?? 0);
  const tax = Number(order.tax_amount ?? 0);
  const total = Number(order.total ?? 0);
  const { processingFee, displayTotal } = calculateCheckoutDisplayTotals({
    subtotal,
    shipping,
    tax,
    fulfillment: order.fulfillment === "pickup" ? "pickup" : "ship",
  });
  const refundedCents = Math.round(Number(order.refund_amount ?? 0));
  const refundedAmount = refundedCents / 100;
  const showOrderProfit = shouldShowOrderProfit(order.status);
  const showPriceBreakdown = order.status !== "pending";
  const isPickup = order.fulfillment === "pickup";
  const isOrderPlaced = [
    "paid",
    "shipped",
    "refunded",
    "partially_refunded",
    "refund_pending",
    "refund_failed",
  ].includes(order.status ?? "");
  const paymentAttemptMade =
    isOrderPlaced || ["failed", "blocked", "review"].includes(order.status ?? "");
  const totalItemCost = normalizedItems.reduce((sum, item) => {
    const financials = getOrderItemFinancials(item as AdminOrderItem);
    return sum + financials.unitCost * financials.quantity;
  }, 0);
  const refundedItemCost = normalizedItems.reduce((sum, item) => {
    if (!item.refunded_at) {
      return sum;
    }
    const financials = getOrderItemFinancials(item as AdminOrderItem);
    return sum + financials.unitCost * financials.quantity;
  }, 0);
  const effectiveItemCost = Math.max(0, totalItemCost - refundedItemCost);
  const sellerRevenue = Math.max(displayTotal - processingFee - refundedAmount, 0);
  const totalProfit = sellerRevenue - effectiveItemCost;
  const isRefundable =
    ["paid", "shipped", "partially_refunded", "refund_failed"].includes(
      order.status ?? "",
    ) && Math.round(total * 100) - refundedCents > 0;
  const customerEmail =
    order.profiles?.email ?? order.guest_email ?? paymentTx?.customer_email ?? null;
  const customerName =
    shippingAddr?.name ?? order.profiles?.full_name ?? paymentTx?.billing_name ?? "-";
  const customerPhone = shippingAddr?.phone ?? paymentTx?.billing_phone ?? null;
  const checklistTypes = [
    ...(isPickup ? PICKUP_EMAIL_TYPES : SHIPPING_EMAIL_TYPES),
    ...(refundedCents > 0 ? [REFUND_EMAIL_TYPE] : []),
  ];
  const sessionTimeline: SessionEntry[] = [
    ...paymentEvents.map(
      (event): SessionEntry => ({
        id: `payment-${event.id}`,
        kind: "payment",
        timestamp: event.created_at,
        data: event,
      }),
    ),
    ...emailLogs.map(
      (log): SessionEntry => ({
        id: `email-${log.id}`,
        kind: "email",
        timestamp: log.sent_at,
        data: log,
      }),
    ),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const selectedPaymentEvent =
    paymentEvents.find((event) => event.id === selectedPaymentEventId) ?? null;

  return {
    checklistTypes,
    customerEmail,
    customerName,
    customerPhone,
    displayTotal,
    effectiveItemCost,
    isOrderPlaced,
    isPickup,
    isRefundable,
    items: normalizedItems,
    paymentAttemptMade,
    processingFee,
    refundedAmount,
    refundedCents,
    selectedPaymentEvent,
    sellerRevenue,
    shipping,
    shippingAddr,
    showOrderProfit,
    showPriceBreakdown,
    statusMeta,
    subtotal,
    tax,
    total,
    totalProfit,
    sessionTimeline,
  };
}

export {
  fmtDate,
  getAvsLabel,
  getCvvLabel,
  getEmailTypeMeta,
  getEventMeta,
  getNoFraudBadge,
  getOrderStatusMeta,
  getRelatedCheckoutLogs,
};
