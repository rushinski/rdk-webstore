"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Mail,
  Package,
  RefreshCw,
  Terminal,
  Truck,
  X,
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
import { Toast } from "@/components/ui/Toast";
import {
  calculateCheckoutDisplayTotals,
  PROCESSING_FEE_LABEL,
} from "@/lib/checkout/display-pricing";
import { shouldShowOrderProfit } from "@/lib/orders/metrics";

type ProductImage = { url: string; is_primary?: boolean; sort_order?: number };

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number | null;
  line_total: number;
  refund_amount?: number | null;
  refunded_at?: string | null;
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    title_display?: string | null;
    title_raw?: string | null;
    category?: string | null;
    sku?: string | null;
    cost_cents?: number | null;
    description?: string | null;
    created_at?: string | null;
    images?: ProductImage[];
    tags?: { tag?: { label?: string | null; group_key?: string | null } | null }[];
  } | null;
  variant?: {
    id: string;
    size_label?: string | null;
    price_cents?: number | null;
    cost_cents?: number | null;
  } | null;
};

type OrderShipping = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
};

type Order = {
  id: string;
  user_id?: string | null;
  status?: string | null;
  total?: number | null;
  subtotal?: number | null;
  shipping?: number | null;
  tax_amount?: number | null;
  refund_amount?: number | null;
  refunded_at?: string | null;
  fulfillment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  guest_email?: string | null;
  failure_reason?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  label_url?: string | null;
  label_created_at?: string | null;
  profiles?: { email?: string | null; full_name?: string | null } | null;
  items?: OrderItem[];
  shipping_address?: OrderShipping | OrderShipping[] | null;
};

type PaymentTransaction = {
  id: string;
  payrilla_reference_number?: number | null;
  payrilla_auth_code?: string | null;
  payrilla_status?: string | null;
  card_type?: string | null;
  card_last4?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
  avs_result_code?: string | null;
  cvv2_result_code?: string | null;
  three_ds_status?: string | null;
  nofraud_transaction_id?: string | null;
  nofraud_decision?: string | null;
  amount_authorized?: number | null;
  amount_captured?: number | null;
  billing_name?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_zip?: string | null;
  billing_country?: string | null;
  billing_phone?: string | null;
  customer_email?: string | null;
  customer_ip?: string | null;
};

type PaymentEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};

type EmailLog = {
  id: string;
  email_type: string;
  recipient_email: string;
  subject?: string | null;
  sent_at: string;
  delivered_at?: string | null;
  opened_at?: string | null;
  delivery_status: string;
  message_id?: string | null;
  html_snapshot?: string | null;
};

type TrackingEvent = {
  id: string;
  status: string;
  description?: string | null;
  location?: string | null;
  event_timestamp: string;
};

type CheckoutLog = {
  id: string;
  route: string;
  method: string;
  http_status?: number | null;
  duration_ms?: number | null;
  event_label?: string | null;
  error_message?: string | null;
  request_payload?: unknown;
  response_payload?: unknown;
  created_at: string;
};

type TransactionPayload = {
  order: Order;
  paymentTransaction: PaymentTransaction | null;
  paymentEvents: PaymentEvent[];
  emailLogs: EmailLog[];
  trackingEvents: TrackingEvent[];
  checkoutLogs: CheckoutLog[];
};

type SessionEntry =
  | { id: string; kind: "payment"; timestamp: string; data: PaymentEvent }
  | { id: string; kind: "email"; timestamp: string; data: EmailLog }
  | { id: string; kind: "api"; timestamp: string; data: CheckoutLog };

const SHIPPING_EMAIL_TYPES = [
  "order_confirmation",
  "label_created",
  "in_transit",
  "delivered",
] as const;
const PICKUP_EMAIL_TYPES = ["order_confirmation", "pickup_instructions"] as const;

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
        cls: "border border-zinc-700 bg-zinc-800 text-zinc-300",
      };
    default:
      return {
        label: status ?? "Unknown",
        cls: "border border-zinc-700 bg-zinc-800 text-zinc-300",
      };
  }
}

function getAvsLabel(code: string | null | undefined) {
  if (!code) {
    return { label: "-", color: "text-zinc-500" };
  }

  const map: Record<string, { label: string; color: string }> = {
    YYY: { label: `Address & ZIP match (${code})`, color: "text-emerald-400" },
    YYX: { label: `Exact match (${code})`, color: "text-emerald-400" },
    GGG: { label: `International match (${code})`, color: "text-emerald-400" },
    NYZ: { label: `ZIP match only (${code})`, color: "text-amber-400" },
    YNA: { label: `Address match only (${code})`, color: "text-amber-400" },
    NNN: { label: `No match (${code})`, color: "text-red-400" },
    XXU: { label: `Unavailable (${code})`, color: "text-zinc-400" },
  };

  return map[code] ?? { label: `Code: ${code}`, color: "text-zinc-400" };
}

function getCvvLabel(code: string | null | undefined) {
  if (!code) {
    return { label: "-", color: "text-zinc-500" };
  }

  const map: Record<string, { label: string; color: string }> = {
    M: { label: "Match (M)", color: "text-emerald-400" },
    N: { label: "No match (N)", color: "text-red-400" },
    P: { label: "Not processed (P)", color: "text-zinc-400" },
    U: { label: "Unavailable (U)", color: "text-zinc-400" },
    X: { label: "Not applicable (X)", color: "text-zinc-400" },
  };

  return map[code] ?? { label: `Code: ${code}`, color: "text-zinc-400" };
}

function getNoFraudBadge(decision: string | null | undefined) {
  if (!decision) {
    return <span className="text-zinc-500">-</span>;
  }

  const map: Record<string, { label: string; cls: string }> = {
    pass: { label: "Pass", cls: "bg-emerald-900/50 text-emerald-400 border-emerald-800" },
    fail: { label: "Fail", cls: "bg-red-900/50 text-red-400 border-red-800" },
    review: { label: "Review", cls: "bg-amber-900/50 text-amber-400 border-amber-800" },
    fraudulent: { label: "Fraudulent", cls: "bg-red-900/50 text-red-400 border-red-800" },
    skipped: { label: "Skipped", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  };

  const meta = map[decision] ?? {
    label: decision,
    cls: "bg-zinc-800 text-zinc-400 border-zinc-700",
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
        icon: <Info className="h-4 w-4 text-zinc-400" />,
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
        icon: <Info className="h-4 w-4 text-zinc-400" />,
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
    case "order_refunded":
      return {
        label: "Refund confirmation",
        icon: <Info className="h-4 w-4 text-red-400" />,
      };
    case "label_created":
      return {
        label: "Label created",
        icon: <Truck className="h-4 w-4 text-zinc-400" />,
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
        icon: <Package className="h-4 w-4 text-zinc-400" />,
      };
    default:
      return {
        label: type.replace(/_/g, " "),
        icon: <Mail className="h-4 w-4 text-zinc-400" />,
      };
  }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/50 py-2 last:border-0">
      <span className="min-w-[120px] shrink-0 text-sm text-zinc-500">{label}</span>
      <span className="text-right text-sm text-gray-200">{children}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded border border-zinc-800/70 bg-zinc-900 p-5">
      <h2 className="mb-4 text-xs uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </div>
  );
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

function PayloadBlock({ label, payload }: { label: string; payload: unknown }) {
  const content = formatPayload(payload);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        {!content && <span className="text-xs text-zinc-600">No data</span>}
      </div>
      {content && (
        <pre className="overflow-x-auto rounded border border-zinc-800/70 bg-zinc-950/80 p-3 text-[11px] text-zinc-300">
          {content}
        </pre>
      )}
    </div>
  );
}

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentTx, setPaymentTx] = useState<PaymentTransaction | null>(null);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [checkoutLogs, setCheckoutLogs] = useState<CheckoutLog[]>([]);
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
  const [selectedSessionEntryId, setSelectedSessionEntryId] = useState<string | null>(
    null,
  );
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transaction");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTransaction();
  }, [orderId]);

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
      <div className="flex items-center justify-center py-24 text-gray-400">
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
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </button>
        <p className="text-red-400">{error ?? "Transaction not found."}</p>
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
  const checklistTypes = isPickup ? PICKUP_EMAIL_TYPES : SHIPPING_EMAIL_TYPES;

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
    ...checkoutLogs.map(
      (log): SessionEntry => ({
        id: `api-${log.id}`,
        kind: "api",
        timestamp: log.created_at,
        data: log,
      }),
    ),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const selectedApiEntry =
    sessionTimeline.find(
      (entry): entry is Extract<SessionEntry, { kind: "api" }> =>
        entry.kind === "api" && entry.id === selectedSessionEntryId,
    ) ?? null;

  const openItemModal = (item: OrderItem) => {
    setSelectedItem(item as unknown as AdminOrderItem);
    setItemModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <button
        type="button"
        onClick={() => router.push("/admin/transactions")}
        className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Transactions
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Transaction</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${statusMeta.cls}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Created {fmtDate(order.created_at)}
          </p>
          {order.updated_at && order.updated_at !== order.created_at && (
            <p className="mt-0.5 text-xs text-zinc-600">
              Updated {fmtDate(order.updated_at)}
            </p>
          )}
          {order.failure_reason && (
            <p className="mt-1 text-sm text-red-400">{order.failure_reason}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {isRefundable && (
            <button
              type="button"
              onClick={() => setRefundOpen(true)}
              className="bg-red-600 px-4 py-1.5 text-sm text-white transition hover:bg-red-700"
            >
              Issue refund
            </button>
          )}
          {refundedCents > 0 && (
            <div className="text-right text-sm text-red-400">
              -{fmtMoney(refundedAmount)} refunded
            </div>
          )}
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Order number
            </p>
            <div className="font-mono text-2xl font-bold text-white">
              #{order.id.slice(0, 8)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <SectionCard title="Price Breakdown">
            {!showPriceBreakdown && (
              <p className="-mt-2 mb-4 text-xs text-zinc-600">
                Products from this checkout session are shown below. Pricing becomes final
                once checkout completes.
              </p>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No products were recorded for this order.
              </p>
            ) : (
              <div className="space-y-0">
                {items.map((item) => {
                  const title =
                    (item.product?.title_display ??
                      `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()) ||
                    "Item";
                  const imageUrl =
                    item.product?.images?.find((image) => image.is_primary)?.url ??
                    item.product?.images?.[0]?.url ??
                    "/images/rdk-logo.png";
                  const isRefunded = Boolean(item.refunded_at);
                  const showItemProfit = showOrderProfit && !isRefunded;
                  const financials = getOrderItemFinancials(item as AdminOrderItem);
                  const itemCost = financials.unitCost * financials.quantity;
                  const itemProfit = financials.unitProfit * financials.quantity;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openItemModal(item)}
                      className={`group -mx-2 flex w-full items-center gap-4 rounded-sm border border-transparent px-2 py-3 text-left transition-colors hover:border-zinc-700/80 hover:bg-zinc-800/50 ${isRefunded ? "opacity-50" : ""}`}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden border border-zinc-800 bg-zinc-950">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{title}</p>
                        <p className="text-xs text-zinc-500">
                          {item.variant?.size_label
                            ? `Size ${item.variant.size_label} · `
                            : ""}
                          Qty {item.quantity}
                          {isRefunded ? " · Refunded" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {showPriceBreakdown ? (
                          <>
                            <p className="text-sm text-white">
                              {fmtMoney(item.line_total)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Cost {fmtMoney(itemCost)}
                            </p>
                            {showItemProfit && (
                              <p
                                className={`text-xs ${itemProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}
                              >
                                Profit {itemProfit >= 0 ? "+" : ""}
                                {fmtMoney(itemProfit)}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                            Session item
                          </p>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                          View details
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {showPriceBreakdown && (
              <div className="space-y-2 border-t border-zinc-800/70 pt-4 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{fmtMoney(subtotal)}</span>
                </div>
                {(shipping > 0 || order.fulfillment === "ship") && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Shipping</span>
                    <span>{fmtMoney(shipping)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Tax</span>
                    <span>{fmtMoney(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-800/70 pt-2 font-semibold text-white">
                  <span>Customer total</span>
                  <span>{fmtMoney(displayTotal)}</span>
                </div>
                {isOrderPlaced ? (
                  <>
                    <div className="flex justify-between text-red-400">
                      <span>Processing fee ({PROCESSING_FEE_LABEL})</span>
                      <span>-{fmtMoney(processingFee)}</span>
                    </div>
                    {refundedCents > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>Refunded</span>
                        <span>-{fmtMoney(refundedAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-300">
                      <span>Seller revenue</span>
                      <span>{fmtMoney(sellerRevenue)}</span>
                    </div>
                    {showOrderProfit && (
                      <>
                        <div className="flex justify-between text-red-400">
                          <span>Product cost</span>
                          <span>-{fmtMoney(effectiveItemCost)}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800/70 pt-2 font-semibold text-white">
                          <span>Total profit</span>
                          <span
                            className={
                              totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            {totalProfit >= 0 ? "+" : ""}
                            {fmtMoney(totalProfit)}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-zinc-500">
                    <span>Order total before fee</span>
                    <span>{fmtMoney(total)}</span>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {order.fulfillment === "ship" && (
            <SectionCard title="Shipping">
              <div className="space-y-0">
                {shippingAddr ? (
                  <>
                    <DetailRow label="Recipient">{shippingAddr.name ?? "-"}</DetailRow>
                    {shippingAddr.phone && (
                      <DetailRow label="Phone">{shippingAddr.phone}</DetailRow>
                    )}
                    <DetailRow label="Address">
                      {[
                        shippingAddr.line1,
                        shippingAddr.line2,
                        shippingAddr.city,
                        shippingAddr.state,
                        shippingAddr.postal_code,
                        shippingAddr.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </DetailRow>
                  </>
                ) : (
                  <>
                    <DetailRow label="Recipient">-</DetailRow>
                    <DetailRow label="Address">Missing shipping address</DetailRow>
                  </>
                )}
                <DetailRow label="Carrier">{order.shipping_carrier ?? "-"}</DetailRow>
                <DetailRow label="Tracking #">{order.tracking_number ?? "-"}</DetailRow>
                {order.label_created_at && (
                  <DetailRow label="Label created">
                    {fmtDate(order.label_created_at)}
                  </DetailRow>
                )}
                {order.label_url && (
                  <DetailRow label="Label">
                    <a
                      href={order.label_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                    >
                      Download <ExternalLink className="h-3 w-3" />
                    </a>
                  </DetailRow>
                )}
              </div>
              {trackingEvents.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">
                    Tracking Events
                  </p>
                  <ol className="space-y-3">
                    {trackingEvents.map((event) => (
                      <li key={event.id} className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        <div>
                          <p className="text-sm capitalize text-white">
                            {event.status.replace(/_/g, " ")}
                          </p>
                          {event.description && (
                            <p className="text-xs text-zinc-400">{event.description}</p>
                          )}
                          {event.location && (
                            <p className="text-xs text-zinc-500">{event.location}</p>
                          )}
                          <p className="mt-0.5 text-xs text-zinc-600">
                            {fmtDate(event.event_timestamp)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </SectionCard>
          )}

          {paymentAttemptMade && (
            <SectionCard title="Payment Method">
              {!paymentTx ? (
                <p className="text-sm text-zinc-500">
                  No payment data available for this order.
                </p>
              ) : (
                <div className="space-y-0">
                  <DetailRow label="Card type">{paymentTx.card_type ?? "-"}</DetailRow>
                  <DetailRow label="Last 4">
                    {paymentTx.card_last4 ? `.... ${paymentTx.card_last4}` : "-"}
                  </DetailRow>
                  <DetailRow label="Expires">
                    {paymentTx.card_expiry_month && paymentTx.card_expiry_year
                      ? `${String(paymentTx.card_expiry_month).padStart(2, "0")} / ${paymentTx.card_expiry_year}`
                      : "-"}
                  </DetailRow>
                  <DetailRow label="Cardholder">
                    {paymentTx.billing_name ?? "-"}
                  </DetailRow>
                  <DetailRow label="CVV check">
                    <span className={getCvvLabel(paymentTx.cvv2_result_code).color}>
                      {getCvvLabel(paymentTx.cvv2_result_code).label}
                    </span>
                  </DetailRow>
                  <DetailRow label="AVS result">
                    <span className={getAvsLabel(paymentTx.avs_result_code).color}>
                      {getAvsLabel(paymentTx.avs_result_code).label}
                    </span>
                  </DetailRow>
                  {paymentTx.three_ds_status && (
                    <DetailRow label="3D Secure">{paymentTx.three_ds_status}</DetailRow>
                  )}
                  <DetailRow label="Billing address">
                    {[
                      paymentTx.billing_address,
                      paymentTx.billing_city,
                      paymentTx.billing_state,
                      paymentTx.billing_zip,
                      paymentTx.billing_country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </DetailRow>
                </div>
              )}
            </SectionCard>
          )}

          {isOrderPlaced && (
            <SectionCard title="Email Checklist">
              <p className="-mt-2 mb-4 text-xs text-zinc-600">
                {isPickup ? "Pickup order" : "Shipping order"} - Expected emails
              </p>
              <div className="space-y-0">
                {checklistTypes.map((emailType) => {
                  const meta = getEmailTypeMeta(emailType);
                  const matchingLogs = emailLogs.filter(
                    (log) => log.email_type === emailType,
                  );
                  const latestLog =
                    matchingLogs.length > 0
                      ? [...matchingLogs].sort(
                          (a, b) =>
                            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
                        )[0]
                      : null;

                  const statusEl = latestLog ? (
                    latestLog.delivery_status === "delivered" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Delivered
                      </span>
                    ) : latestLog.delivery_status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <XCircle className="h-3 w-3" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" /> Sent
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-zinc-600">Not sent</span>
                  );

                  const isResending = resendingEmail === emailType;

                  return (
                    <div
                      key={emailType}
                      className="flex items-center justify-between gap-4 border-b border-zinc-800/50 py-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm text-white">{meta.label}</p>
                        {latestLog && (
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {fmtDate(latestLog.sent_at, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        <div className="mt-0.5">{statusEl}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {latestLog?.html_snapshot && (
                          <button
                            type="button"
                            onClick={() => setEmailPreview(latestLog)}
                            className="text-xs text-zinc-400 transition-colors hover:text-white"
                          >
                            View
                          </button>
                        )}
                        {latestLog && (
                          <button
                            type="button"
                            onClick={() => {
                              void handleResendEmail(emailType);
                            }}
                            disabled={isResending || Boolean(resendingEmail)}
                            className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`}
                            />
                            {isResending ? "Sending..." : "Resend"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Session Activity">
            {sessionTimeline.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No activity recorded for this order.
              </p>
            ) : (
              <ol className="space-y-3">
                {sessionTimeline.map((entry) => {
                  if (entry.kind === "payment") {
                    const event = entry.data;
                    const meta = getEventMeta(event.event_type, event.event_data);

                    return (
                      <li
                        key={entry.id}
                        className="rounded border border-zinc-800/60 bg-zinc-950/30 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">{meta.icon}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white">{meta.label}</p>
                            {meta.description && (
                              <p className="mt-0.5 text-xs text-zinc-400">
                                {meta.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-zinc-500">
                              {fmtDate(event.created_at)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  if (entry.kind === "api") {
                    const log = entry.data;
                    const isSelected = selectedApiEntry?.id === entry.id;
                    const isError =
                      log.http_status !== null && (log.http_status ?? 0) >= 400;
                    const statusColor = isError ? "text-red-400" : "text-emerald-400";

                    return (
                      <li
                        key={entry.id}
                        className="rounded border border-zinc-800/60 bg-zinc-950/30"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSessionEntryId((current) =>
                              current === entry.id ? null : entry.id,
                            )
                          }
                          className="w-full px-4 py-4 text-left"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                              <div className="min-w-0">
                                <p className="truncate text-sm text-white">
                                  {log.event_label ?? log.route}
                                </p>
                                <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
                                  {log.method} {log.route}
                                </p>
                                {log.error_message && (
                                  <p className="mt-1 text-xs text-red-400">
                                    {log.error_message}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-zinc-500">
                                  {fmtDate(log.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {log.http_status !== null &&
                                  log.http_status !== undefined && (
                                    <span className={`text-xs font-mono ${statusColor}`}>
                                      {log.http_status}
                                    </span>
                                  )}
                                {log.duration_ms !== null &&
                                  log.duration_ms !== undefined && (
                                    <span className="text-xs text-zinc-500">
                                      {log.duration_ms}ms
                                    </span>
                                  )}
                              </div>
                              <p className="mt-1 text-xs text-red-400">
                                {isSelected ? "Hide data" : "View data"}
                              </p>
                            </div>
                          </div>
                        </button>

                        {isSelected && (
                          <div className="space-y-4 border-t border-zinc-800/70 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="rounded border border-zinc-800/70 bg-zinc-900/70 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  API Call
                                </p>
                                <p className="mt-2 break-all font-mono text-sm text-zinc-200">
                                  {log.method} {log.route}
                                </p>
                              </div>
                              <div className="rounded border border-zinc-800/70 bg-zinc-900/70 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  HTTP Status
                                </p>
                                <p
                                  className={`mt-2 text-sm font-semibold ${statusColor}`}
                                >
                                  {log.http_status ?? "-"}
                                </p>
                              </div>
                              <div className="rounded border border-zinc-800/70 bg-zinc-900/70 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  Response Time
                                </p>
                                <p className="mt-2 text-sm font-semibold text-zinc-200">
                                  {log.duration_ms !== null &&
                                  log.duration_ms !== undefined
                                    ? `${log.duration_ms}ms`
                                    : "-"}
                                </p>
                              </div>
                            </div>
                            <PayloadBlock label="Request" payload={log.request_payload} />
                            <PayloadBlock
                              label="Response"
                              payload={log.response_payload}
                            />
                          </div>
                        )}
                      </li>
                    );
                  }

                  const log = entry.data;
                  const emailMeta = getEmailTypeMeta(log.email_type);
                  const deliveryColor =
                    log.delivery_status === "delivered"
                      ? "text-emerald-400"
                      : log.delivery_status === "failed"
                        ? "text-red-400"
                        : "text-zinc-400";

                  return (
                    <li
                      key={entry.id}
                      className="rounded border border-zinc-800/60 bg-zinc-950/30 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{emailMeta.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white">{emailMeta.label}</p>
                          <p className="text-xs text-zinc-500">
                            To: {log.recipient_email}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            Sent{" "}
                            {fmtDate(log.sent_at, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          {log.delivered_at && (
                            <p className="text-xs text-zinc-500">
                              Delivered{" "}
                              {fmtDate(log.delivered_at, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                          {log.opened_at && (
                            <p className="text-xs text-emerald-500">
                              Opened{" "}
                              {fmtDate(log.opened_at, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                          <span className={`text-xs capitalize ${deliveryColor}`}>
                            {log.delivery_status}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Details">
            <div className="space-y-0">
              <DetailRow label="Order #">
                <span className="font-mono">#{order.id.slice(0, 8)}</span>
              </DetailRow>
              <DetailRow label="Status">{statusMeta.label}</DetailRow>
              <DetailRow label="Fulfillment">
                {isPickup ? "Pickup" : "Shipping"}
              </DetailRow>
              <DetailRow label="Created">{fmtDate(order.created_at)}</DetailRow>
              <DetailRow label="Updated">{fmtDate(order.updated_at)}</DetailRow>
              {paymentTx?.payrilla_status && (
                <DetailRow label="Payment status">{paymentTx.payrilla_status}</DetailRow>
              )}
              {paymentTx?.payrilla_reference_number !== null &&
                paymentTx?.payrilla_reference_number !== undefined && (
                  <DetailRow label="Reference #">
                    {paymentTx.payrilla_reference_number}
                  </DetailRow>
                )}
              {paymentTx?.id && (
                <DetailRow label="Payment ID">
                  <span className="font-mono text-xs">{paymentTx.id}</span>
                </DetailRow>
              )}
              {paymentTx?.amount_authorized !== null &&
                paymentTx?.amount_authorized !== undefined && (
                  <DetailRow label="Amount authorized">
                    {fmtMoney(paymentTx.amount_authorized)}
                  </DetailRow>
                )}
              {paymentTx?.amount_captured !== null &&
                paymentTx?.amount_captured !== undefined && (
                  <DetailRow label="Amount captured">
                    {fmtMoney(paymentTx.amount_captured)}
                  </DetailRow>
                )}
              {paymentTx?.payrilla_auth_code && (
                <DetailRow label="Auth code">{paymentTx.payrilla_auth_code}</DetailRow>
              )}
              {paymentTx && (
                <DetailRow label="NoFraud decision">
                  {getNoFraudBadge(paymentTx.nofraud_decision)}
                </DetailRow>
              )}
              {paymentTx?.nofraud_transaction_id && (
                <DetailRow label="NoFraud ID">
                  {paymentTx.nofraud_transaction_id}
                </DetailRow>
              )}
              {paymentTx?.customer_ip && (
                <DetailRow label="Customer IP">{paymentTx.customer_ip}</DetailRow>
              )}
              {refundedCents > 0 && (
                <DetailRow label="Refunded">
                  {fmtMoney(refundedAmount)}
                  {order.refunded_at ? ` · ${fmtDate(order.refunded_at)}` : ""}
                </DetailRow>
              )}
              {order.shipping_carrier && (
                <DetailRow label="Carrier">{order.shipping_carrier}</DetailRow>
              )}
              {order.tracking_number && (
                <DetailRow label="Tracking #">{order.tracking_number}</DetailRow>
              )}
              {order.failure_reason && (
                <DetailRow label="Failure reason">{order.failure_reason}</DetailRow>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Customer">
            <div className="space-y-0">
              <DetailRow label="Name">{customerName}</DetailRow>
              <DetailRow label="Email">{customerEmail ?? "-"}</DetailRow>
              <DetailRow label="Phone">{customerPhone ?? "-"}</DetailRow>
              <DetailRow label="Checkout">
                {order.user_id ? "Registered customer" : "Guest checkout"}
              </DetailRow>
              {!isPickup && (
                <DetailRow label="Recipient">
                  {shippingAddr?.name ?? customerName}
                </DetailRow>
              )}
              {paymentTx?.billing_name &&
                paymentTx.billing_name !== customerName &&
                paymentTx.billing_name !== shippingAddr?.name && (
                  <DetailRow label="Billing name">{paymentTx.billing_name}</DetailRow>
                )}
            </div>
          </SectionCard>
        </div>
      </div>

      {emailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {getEmailTypeMeta(emailPreview.email_type).label}
                </p>
                <p className="text-xs text-zinc-500">{emailPreview.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailPreview(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={emailPreview.html_snapshot ?? ""}
                title="Email preview"
                className="h-full min-h-[500px] w-full"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

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
