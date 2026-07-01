"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Info,
  Mail,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

import {
  RefundOrderModal,
  type RefundRequestPayload,
  type RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";
import {
  AdminOrderItemDetailsModal,
  getOrderItemFinancials,
} from "@/components/admin/orders/OrderItemDetailsModal";
import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { Toast } from "@/components/ui/Toast";
import { calculateCheckoutDisplayTotals } from "@/lib/checkout/display-pricing";
import { shouldShowOrderProfit } from "@/lib/orders/metrics";

import { EmailChecklistSection } from "./EmailChecklistSection";
import { EmailPreviewModal } from "./EmailPreviewModal";
import { PaymentEventDrawer } from "./PaymentEventDrawer";
import { SessionActivitySection } from "./SessionActivitySection";
import { TransactionFulfillmentPanels } from "./TransactionFulfillmentPanels";
import { TransactionPriceBreakdownSection } from "./TransactionPriceBreakdownSection";
import { TransactionSidebar } from "./TransactionSidebar";
import type {
  CheckoutLog,
  EmailLog,
  Order,
  OrderItem,
  PaymentEvent,
  PaymentTransaction,
  SessionEntry,
  TrackingEvent,
  TransactionPayload,
} from "./types";

const SHIPPING_EMAIL_TYPES = [
  "order_confirmation",
  "label_created",
  "in_transit",
  "delivered",
] as const;
const PICKUP_EMAIL_TYPES = ["order_confirmation", "pickup_instructions"] as const;
const REFUND_EMAIL_TYPE = "refund_notification" as const;

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtMoney = (value: number | null | undefined) => fmt.format(Number(value ?? 0));

async function fetchTransactionData(orderId: string): Promise<TransactionPayload> {
  const response = await fetch(`/api/admin/transactions/${orderId}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "Failed to load transaction");
  }

  return {
    order: data.order,
    paymentTransaction: data.paymentTransaction ?? null,
    paymentEvents: data.paymentEvents ?? [],
    emailLogs: data.emailLogs ?? [],
    trackingEvents: data.trackingEvents ?? [],
    checkoutLogs: data.checkoutLogs ?? [],
  };
}

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) {
    return "-";
  }

  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  });
}

function getOrderStatusMeta(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return {
        label: "Succeeded",
        cls: "border border-emerald-800 bg-emerald-950/40 text-emerald-300",
      };
    case "shipped":
      return {
        label: "Shipped",
        cls: "border border-blue-800 bg-blue-950/40 text-blue-300",
      };
    case "refunded":
      return {
        label: "Refunded",
        cls: "border border-red-800 bg-red-950/40 text-red-300",
      };
    case "partially_refunded":
      return {
        label: "Partially refunded",
        cls: "border border-amber-800 bg-amber-950/40 text-amber-300",
      };
    case "refund_pending":
      return {
        label: "Refund pending",
        cls: "border border-amber-800 bg-amber-950/40 text-amber-300",
      };
    case "refund_failed":
      return {
        label: "Refund failed",
        cls: "border border-rose-800 bg-rose-950/40 text-rose-300",
      };
    case "failed":
      return { label: "Failed", cls: "border border-red-800 bg-red-950/40 text-red-300" };
    case "blocked":
      return {
        label: "Blocked",
        cls: "border border-orange-800 bg-orange-950/40 text-orange-300",
      };
    case "review":
      return {
        label: "Under review",
        cls: "border border-yellow-800 bg-yellow-950/40 text-yellow-300",
      };
    case "pending":
      return {
        label: "Incomplete",
        cls: "border border-brand-border bg-brand-page text-brand-text",
      };
    default:
      return {
        label: status ?? "Unknown",
        cls: "border border-brand-border bg-brand-page text-brand-text",
      };
  }
}

function getAvsLabel(code: string | null | undefined) {
  if (!code) {
    return { label: "-", color: "text-brand-muted" };
  }

  const map: Record<string, { label: string; color: string }> = {
    YYY: { label: `Address & ZIP match (${code})`, color: "text-emerald-400" },
    YYX: { label: `Exact match (${code})`, color: "text-emerald-400" },
    GGG: { label: `International match (${code})`, color: "text-emerald-400" },
    NYZ: { label: `ZIP match only (${code})`, color: "text-amber-400" },
    YNA: { label: `Address match only (${code})`, color: "text-amber-400" },
    NNN: { label: `No match (${code})`, color: "text-red-400" },
    XXU: { label: `Unavailable (${code})`, color: "text-brand-muted" },
  };

  return map[code] ?? { label: `Code: ${code}`, color: "text-brand-muted" };
}

function getCvvLabel(code: string | null | undefined) {
  if (!code) {
    return { label: "-", color: "text-brand-muted" };
  }

  const map: Record<string, { label: string; color: string }> = {
    M: { label: "Match (M)", color: "text-emerald-400" },
    N: { label: "No match (N)", color: "text-red-400" },
    P: { label: "Not processed (P)", color: "text-brand-muted" },
    U: { label: "Unavailable (U)", color: "text-brand-muted" },
    X: { label: "Not applicable (X)", color: "text-brand-muted" },
  };

  return map[code] ?? { label: `Code: ${code}`, color: "text-brand-muted" };
}

function getNoFraudBadge(decision: string | null | undefined) {
  if (!decision) {
    return <span className="text-brand-muted">-</span>;
  }

  const map: Record<string, { label: string; cls: string }> = {
    pass: { label: "Pass", cls: "bg-emerald-900/50 text-emerald-400 border-emerald-800" },
    fail: { label: "Fail", cls: "bg-red-900/50 text-red-400 border-red-800" },
    review: { label: "Review", cls: "bg-amber-900/50 text-amber-400 border-amber-800" },
    fraudulent: { label: "Fraudulent", cls: "bg-red-900/50 text-red-400 border-red-800" },
    skipped: {
      label: "Skipped",
      cls: "bg-brand-page text-brand-muted border-brand-border",
    },
  };

  const meta = map[decision] ?? {
    label: decision,
    cls: "bg-brand-page text-brand-muted border-brand-border",
  };

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
function getDeclineDescription(eventData: Record<string, unknown>) {
  const errorCode = String(eventData.error_code ?? eventData.decline_code ?? "").trim();
  const statusCode = String(eventData.status_code ?? "").trim();
  const statusText = String(eventData.status ?? eventData.response_text ?? "").trim();

  const codeMap: Record<string, string> = {
    "05": "Do not honor",
    "14": "Invalid card number",
    "51": "Insufficient funds",
    "54": "Expired card",
    "57": "Transaction not permitted",
    "61": "Exceeds withdrawal limit",
    "62": "Restricted card",
    "65": "Activity limit exceeded",
    "78": "No account on file",
    "41": "Lost card",
    "43": "Stolen card",
    "82": "Incorrect CVV",
    N7: "CVV2 mismatch",
    D: "Declined",
    E: "Processor error",
  };

  if (errorCode && codeMap[errorCode]) {
    return codeMap[errorCode];
  }
  if (statusCode && codeMap[statusCode]) {
    return codeMap[statusCode];
  }
  if (statusText && statusText.toLowerCase() !== "declined") {
    return statusText;
  }

  return null;
}

function getEventMeta(
  type: string,
  eventData?: Record<string, unknown>,
): { icon: React.ReactNode; label: string; description?: string } {
  const desc = eventData ? getDeclineDescription(eventData) : undefined;

  switch (type) {
    case "payment_started":
      return {
        icon: <Info className="h-4 w-4 text-brand-muted" />,
        label: "Checkout started",
      };
    case "authorization_approved":
      return {
        icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
        label: "Payment authorized",
      };
    case "authorization_declined":
      return {
        icon: <XCircle className="h-4 w-4 text-red-400" />,
        label: "Authorization declined",
        description: desc ?? undefined,
      };
    case "authorization_error":
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
        label: "Authorization error",
        description: desc ?? undefined,
      };
    case "fraud_check_pass":
      return {
        icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
        label: "Fraud screening passed",
      };
    case "fraud_check_fail":
      return {
        icon: <XCircle className="h-4 w-4 text-red-400" />,
        label: "Fraud screening failed",
      };
    case "fraud_check_review":
      return {
        icon: <Clock className="h-4 w-4 text-amber-400" />,
        label: "Under review - NoFraud investigating",
      };
    case "fraud_check_skipped":
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        label: "Fraud screening skipped",
      };
    case "payment_captured":
      return {
        icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
        label: "Payment captured",
      };
    case "payment_voided":
      return {
        icon: <XCircle className="h-4 w-4 text-red-400" />,
        label: "Payment voided",
      };
    case "payment_refunded":
      return {
        icon: <Info className="h-4 w-4 text-blue-400" />,
        label: "Full refund issued",
      };
    case "payment_refund_partial":
      return {
        icon: <Info className="h-4 w-4 text-blue-400" />,
        label: "Partial refund issued",
      };
    default:
      return {
        icon: <Info className="h-4 w-4 text-brand-muted" />,
        label: type.replace(/_/g, " "),
      };
  }
}

function getEmailTypeMeta(type: string) {
  switch (type) {
    case "order_confirmation":
      return {
        label: "Order confirmation",
        icon: <Package className="h-4 w-4 text-blue-400" />,
      };
    case "refund_notification":
    case "order_refunded":
      return {
        label: "Refund confirmation",
        icon: <Info className="h-4 w-4 text-red-400" />,
      };
    case "label_created":
      return {
        label: "Label created",
        icon: <Truck className="h-4 w-4 text-brand-muted" />,
      };
    case "in_transit":
      return { label: "In transit", icon: <Truck className="h-4 w-4 text-blue-400" /> };
    case "delivered":
      return {
        label: "Delivered",
        icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
      };
    case "pickup_instructions":
      return {
        label: "Pickup instructions",
        icon: <Package className="h-4 w-4 text-brand-muted" />,
      };
    default:
      return {
        label: type.replace(/_/g, " "),
        icon: <Mail className="h-4 w-4 text-brand-muted" />,
      };
  }
}

function formatPayload(payload: unknown) {
  if (payload === null || payload === undefined) {
    return null;
  }
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function getRelatedCheckoutLogs(event: PaymentEvent, logs: CheckoutLog[]) {
  const eventTime = new Date(event.created_at).getTime();
  const keywordsByType: Record<string, string[]> = {
    payment_started: ["checkout"],
    authorization_approved: ["approved", "response"],
    authorization_declined: ["declined", "payment error"],
    authorization_error: ["processing error", "payment error"],
    fraud_check_pass: ["approved", "order complete"],
    fraud_check_fail: ["fraud", "blocked"],
    fraud_check_review: ["review"],
    fraud_check_skipped: ["approved", "response"],
    payment_captured: ["approved", "order complete", "response"],
    payment_voided: ["void", "blocked", "fraud"],
    payment_refunded: ["refund"],
    payment_refund_partial: ["refund"],
  };

  const keywords = keywordsByType[event.event_type] ?? [];
  const matched = logs.filter((log) => {
    const haystack = [
      log.event_label,
      log.route,
      log.method,
      log.error_message,
      formatPayload(log.response_payload),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) => haystack.includes(keyword));
  });

  const nearby = logs.filter((log) => {
    const logTime = new Date(log.created_at).getTime();
    return Math.abs(logTime - eventTime) <= 2 * 60 * 1000;
  });

  return [...matched, ...nearby]
    .filter((log, index, arr) => arr.findIndex((entry) => entry.id === log.id) === index)
    .sort(
      (a, b) =>
        Math.abs(new Date(a.created_at).getTime() - eventTime) -
        Math.abs(new Date(b.created_at).getTime() - eventTime),
    );
}

export function AdminTransactionDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentTx, setPaymentTx] = useState<PaymentTransaction | null>(null);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [checkoutLogs, setCheckoutLogs] = useState<CheckoutLog[]>([]);
  const [customerSummary, setCustomerSummary] =
    useState<TransactionPayload["customer"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailLog | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [isRefundSubmitting, setIsRefundSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [selectedPaymentEventId, setSelectedPaymentEventId] = useState<string | null>(
    null,
  );
  const [isPaymentDrawerVisible, setIsPaymentDrawerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminOrderItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const loadTransaction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTransactionData(orderId);
      setOrder(data.order);
      setPaymentTx(data.paymentTransaction);
      setPaymentEvents(data.paymentEvents);
      setEmailLogs(data.emailLogs);
      setTrackingEvents(data.trackingEvents);
      setCheckoutLogs(data.checkoutLogs);
      setCustomerSummary(data.customer ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transaction");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTransaction();
  }, [orderId]);

  useEffect(() => {
    if (!selectedPaymentEventId) {
      setIsPaymentDrawerVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsPaymentDrawerVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedPaymentEventId]);

  useEffect(() => {
    if (!selectedPaymentEventId && !emailPreview) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [emailPreview, selectedPaymentEventId]);

  const confirmRefund = async (payload: RefundRequestPayload) => {
    if (!order) {
      return;
    }

    setIsRefundSubmitting(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success !== false) {
        const label =
          payload.type === "full"
            ? "Full refund processed."
            : payload.type === "product"
              ? "Product refund processed."
              : "Custom refund processed.";
        const warning = typeof data?.warning === "string" ? data.warning : null;
        setToast({
          message: warning ? `${label} ${warning}` : label,
          tone: warning ? "info" : "success",
        });
        setRefundOpen(false);
        await loadTransaction();
      } else {
        setToast({
          message: (data as { error?: string }).error ?? "Refund failed.",
          tone: "error",
        });
      }
    } catch {
      setToast({ message: "Refund failed.", tone: "error" });
    } finally {
      setIsRefundSubmitting(false);
    }
  };

  const handleResendEmail = async (emailType: string) => {
    if (!order || resendingEmail) {
      return;
    }

    setResendingEmail(emailType);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setToast({ message: "Email resent successfully.", tone: "success" });
        await loadTransaction();
      } else {
        setToast({
          message: (data as { error?: string }).error ?? "Failed to resend email.",
          tone: "error",
        });
      }
    } catch {
      setToast({ message: "Failed to resend email.", tone: "error" });
    } finally {
      setResendingEmail(null);
    }
  };
  if (isLoading) {
    return (
      <div className="border border-brand-border bg-brand-surface px-6 py-24 text-center text-brand-muted">
        Loading...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin/transactions")}
          className="flex items-center gap-2 text-sm text-brand-muted transition-colors hover:text-brand-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </button>
        <AdminEmptyState
          title="Transaction Not Available"
          description={error ?? "Transaction not found."}
        />
      </div>
    );
  }

  const statusMeta = getOrderStatusMeta(order.status);
  const shippingAddr = Array.isArray(order.shipping_address)
    ? order.shipping_address[0]
    : order.shipping_address;
  const items = order.items ?? [];
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
  const totalItemCost = items.reduce((sum, item) => {
    const financials = getOrderItemFinancials(item as AdminOrderItem);
    return sum + financials.unitCost * financials.quantity;
  }, 0);
  const refundedItemCost = items.reduce((sum, item) => {
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

  const refundableOrder: RefundableOrder = {
    id: order.id,
    total: order.total,
    refund_amount: order.refund_amount,
    items: items as unknown as RefundableOrder["items"],
  };

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
  const relatedCheckoutLogs = selectedPaymentEvent
    ? getRelatedCheckoutLogs(selectedPaymentEvent, checkoutLogs)
    : [];

  const closePaymentDrawer = () => {
    setIsPaymentDrawerVisible(false);
    window.setTimeout(() => {
      setSelectedPaymentEventId(null);
    }, 220);
  };

  const openItemModal = (item: OrderItem) => {
    setSelectedItem(item as unknown as AdminOrderItem);
    setItemModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-8xl">
      <button
        type="button"
        onClick={() => router.push("/admin/transactions")}
        className="flex items-center gap-2 text-sm text-brand-muted transition-colors hover:text-brand-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Transactions
      </button>

      <AdminPageHeader
        title={`#${order.id.slice(0, 8)}`}
        description={
          order.failure_reason
            ? order.failure_reason
            : `${isPickup ? "Pickup" : "Shipping"} order activity, payment state, and customer session detail.`
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <AdminStatusBadge
              tone={
                order.status === "failed" || order.status === "refund_failed"
                  ? "danger"
                  : order.status === "review" ||
                      order.status === "refund_pending" ||
                      order.status === "partially_refunded"
                    ? "warning"
                    : "success"
              }
            >
              {statusMeta.label}
            </AdminStatusBadge>
            {isRefundable && (
              <button
                type="button"
                onClick={() => setRefundOpen(true)}
                className={adminButtonStyles.danger}
              >
                Issue refund
              </button>
            )}
            {refundedCents > 0 && (
              <div className="text-right text-sm text-red-700">
                -{fmtMoney(refundedAmount)} refunded
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <TransactionPriceBreakdownSection
            order={order}
            items={items}
            showPriceBreakdown={showPriceBreakdown}
            showOrderProfit={showOrderProfit}
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            displayTotal={displayTotal}
            processingFee={processingFee}
            refundedCents={refundedCents}
            refundedAmount={refundedAmount}
            sellerRevenue={sellerRevenue}
            effectiveItemCost={effectiveItemCost}
            totalProfit={totalProfit}
            isOrderPlaced={isOrderPlaced}
            fmtMoney={fmtMoney}
            onOpenItemModal={openItemModal}
            getOrderItemFinancials={(item) =>
              getOrderItemFinancials(item as AdminOrderItem)
            }
          />

          <TransactionFulfillmentPanels
            order={order}
            shippingAddr={shippingAddr ?? null}
            trackingEvents={trackingEvents}
            paymentAttemptMade={paymentAttemptMade}
            paymentTx={paymentTx}
            fmtDate={fmtDate}
            getCvvLabel={getCvvLabel}
            getAvsLabel={getAvsLabel}
          />

          {isOrderPlaced && (
            <EmailChecklistSection
              checklistTypes={checklistTypes}
              emailLogs={emailLogs}
              isPickup={isPickup}
              resendingEmail={resendingEmail}
              onPreview={setEmailPreview}
              onResend={(emailType) => {
                void handleResendEmail(emailType);
              }}
              getEmailTypeMeta={getEmailTypeMeta}
              fmtDate={fmtDate}
            />
          )}

          <SessionActivitySection
            sessionTimeline={sessionTimeline}
            onSelectPaymentEvent={setSelectedPaymentEventId}
            onPreviewEmail={setEmailPreview}
            getEventMeta={getEventMeta}
            getEmailTypeMeta={getEmailTypeMeta}
            fmtDate={fmtDate}
          />
        </div>

        <TransactionSidebar
          order={order}
          paymentTx={paymentTx}
          statusLabel={statusMeta.label}
          isPickup={isPickup}
          refundedCents={refundedCents}
          refundedAmount={refundedAmount}
          customerSummary={customerSummary ?? null}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          shippingAddr={shippingAddr ?? null}
          fmtDate={fmtDate}
          fmtMoney={fmtMoney}
          getNoFraudBadge={getNoFraudBadge}
          onOpenCustomer={(routeId) => router.push(`/admin/customers/${routeId}`)}
        />
      </div>

      <EmailPreviewModal
        emailPreview={emailPreview}
        title={emailPreview ? getEmailTypeMeta(emailPreview.email_type).label : ""}
        onClose={() => setEmailPreview(null)}
      />

      <PaymentEventDrawer
        selectedPaymentEvent={selectedPaymentEvent}
        isVisible={isPaymentDrawerVisible}
        relatedCheckoutLogs={relatedCheckoutLogs}
        onClose={closePaymentDrawer}
        getEventMeta={getEventMeta}
        fmtDate={fmtDate}
      />

      <RefundOrderModal
        open={refundOpen}
        order={refundableOrder}
        submitting={isRefundSubmitting}
        onClose={() => setRefundOpen(false)}
        onConfirm={confirmRefund}
      />

      <AdminOrderItemDetailsModal
        open={itemModalOpen}
        item={selectedItem}
        showProfit={showOrderProfit && !Boolean(selectedItem?.refunded_at)}
        onClose={() => {
          setItemModalOpen(false);
          setSelectedItem(null);
        }}
      />

      {toast && (
        <Toast
          open={Boolean(toast)}
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
