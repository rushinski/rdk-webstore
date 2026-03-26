// app/admin/transactions/[orderId]/page.tsx
// Full transaction detail page: price breakdown, session activity, email checklist,
// payment method, and shipping details.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  AlertTriangle,
  Mail,
  Package,
  Truck,
  ExternalLink,
  X,
  RefreshCw,
} from "lucide-react";

import {
  RefundOrderModal,
  type RefundRequestPayload,
  type RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";
import { AdminOrderItemDetailsModal } from "@/components/admin/orders/OrderItemDetailsModal";
import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { Toast } from "@/components/ui/Toast";
import {
  calculateCheckoutDisplayTotals,
  PROCESSING_FEE_LABEL,
} from "@/lib/checkout/display-pricing";
import { shouldShowOrderProfit } from "@/lib/orders/metrics";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  three_ds_eci?: string | null;
  nofraud_transaction_id?: string | null;
  nofraud_decision?: string | null;
  amount_requested?: number | null;
  amount_authorized?: number | null;
  amount_captured?: number | null;
  amount_refunded?: number | null;
  billing_name?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_zip?: string | null;
  billing_country?: string | null;
  billing_phone?: string | null;
  customer_email?: string | null;
  customer_ip?: string | null;
  created_at?: string | null;
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
  plain_text_snapshot?: string | null;
};

type TrackingEvent = {
  id: string;
  status: string;
  description?: string | null;
  location?: string | null;
  event_timestamp: string;
  carrier: string;
  tracking_number: string;
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtMoney = (v: number | null | undefined) => fmt.format(Number(v ?? 0));

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
    XXR: { label: `Retry (${code})`, color: "text-zinc-400" },
    XXS: { label: `Not supported (${code})`, color: "text-zinc-400" },
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
    skipped: {
      label: "Skipped (down)",
      cls: "bg-zinc-800 text-zinc-400 border-zinc-700",
    },
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

// Map PayRilla/standard decline error codes to human-readable descriptions
function getDeclineDescription(eventData: Record<string, unknown>): string | null {
  const errorCode = String(eventData.error_code ?? eventData.decline_code ?? "").trim();
  const statusCode = String(eventData.status_code ?? "").trim();
  const statusText = String(eventData.status ?? eventData.response_text ?? "").trim();

  const codeMap: Record<string, string> = {
    "05": "Do not honor - bank declined without specific reason",
    "14": "Invalid card number",
    "51": "Insufficient funds",
    "54": "Expired card",
    "57": "Transaction not permitted to cardholder",
    "61": "Exceeds withdrawal limit",
    "62": "Restricted card",
    "65": "Activity limit exceeded",
    "78": "No account on file",
    "41": "Lost card - reported stolen",
    "43": "Stolen card - reported stolen",
    "04": "Pick up card - contact bank",
    "07": "Pick up card, special conditions",
    "15": "No such issuer",
    "33": "Expired card - re-enter",
    "36": "Restricted card",
    "38": "Allowable PIN tries exceeded",
    "75": "Allowable number of PIN tries exceeded",
    "82": "Incorrect CVV",
    N7: "CVV2 mismatch",
    R0: "Stop payment order",
    R1: "Revocation of authorization order",
    D: "Declined",
    E: "Error processing card",
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
        icon: <Info className="w-4 h-4 text-zinc-400" />,
        label: "Checkout started",
      };
    case "3ds_completed":
      return {
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        label: "3D Secure completed",
      };
    case "authorization_approved":
      return {
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        label: "Payment authorized",
      };
    case "authorization_declined":
      return {
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        label: "Authorization declined",
        description: desc ?? undefined,
      };
    case "authorization_error":
      return {
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
        label: "Authorization error",
        description: desc ?? undefined,
      };
    case "fraud_check_pass":
      return {
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        label: "Fraud screening passed",
      };
    case "fraud_check_fail":
      return {
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        label: "Fraud screening failed",
      };
    case "fraud_check_review":
      return {
        icon: <Clock className="w-4 h-4 text-amber-400" />,
        label: "Under review - NoFraud investigating",
      };
    case "fraud_check_skipped":
      return {
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        label: "Fraud screening skipped (service unavailable)",
      };
    case "fraud_review_resolved":
      return {
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        label: "Fraud review resolved",
      };
    case "payment_captured":
      return {
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        label: "Payment captured",
      };
    case "payment_voided":
      return {
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        label: "Payment voided",
      };
    case "payment_refunded":
      return {
        icon: <Info className="w-4 h-4 text-blue-400" />,
        label: "Full refund issued",
      };
    case "payment_refund_partial":
      return {
        icon: <Info className="w-4 h-4 text-blue-400" />,
        label: "Partial refund issued",
      };
    case "webhook_received":
      return {
        icon: <Info className="w-4 h-4 text-zinc-400" />,
        label: "Webhook received",
      };
    default:
      return {
        icon: <Info className="w-4 h-4 text-zinc-400" />,
        label: type.replace(/_/g, " "),
      };
  }
}

function getEmailTypeMeta(type: string): { label: string; icon: React.ReactNode } {
  switch (type) {
    case "order_confirmation":
      return {
        label: "Order confirmation",
        icon: <Package className="w-4 h-4 text-blue-400" />,
      };
    case "order_refunded":
      return {
        label: "Refund confirmation",
        icon: <Info className="w-4 h-4 text-red-400" />,
      };
    case "label_created":
      return {
        label: "Label created",
        icon: <Truck className="w-4 h-4 text-zinc-400" />,
      };
    case "in_transit":
      return { label: "In transit", icon: <Truck className="w-4 h-4 text-blue-400" /> };
    case "delivered":
      return {
        label: "Delivered",
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      };
    case "pickup_instructions":
      return {
        label: "Pickup instructions",
        icon: <Package className="w-4 h-4 text-zinc-400" />,
      };
    default:
      return {
        label: type.replace(/_/g, " "),
        icon: <Mail className="w-4 h-4 text-zinc-400" />,
      };
  }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-500 text-sm shrink-0 min-w-[140px]">{label}</span>
      <span className="text-sm text-gray-200 text-right">{children}</span>
    </div>
  );
}

function InlineDetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 py-2.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <div className="min-w-0 text-sm text-gray-200">{children}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded p-5 space-y-1">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SessionEntry =
  | { kind: "payment"; data: PaymentEvent }
  | { kind: "email"; data: EmailLog };

const SHIPPING_EMAIL_TYPES = [
  "order_confirmation",
  "label_created",
  "in_transit",
  "delivered",
] as const;
const PICKUP_EMAIL_TYPES = ["order_confirmation", "pickup_instructions"] as const;

type VerificationTone = "success" | "error" | "muted";

function formatCountryName(code: string | null | undefined) {
  if (!code) {
    return "-";
  }
  const normalized = code.trim().toUpperCase();
  try {
    const displayName = new Intl.DisplayNames(["en-US"], { type: "region" }).of(
      normalized,
    );
    return displayName ?? normalized;
  } catch {
    return normalized;
  }
}

function getCvvCheckMeta(code: string | null | undefined): {
  label: string;
  tone: VerificationTone;
} {
  switch (code) {
    case "M":
      return { label: "Passed", tone: "success" };
    case "N":
      return { label: "Failed", tone: "error" };
    case "P":
    case "U":
    case "X":
      return { label: "Unavailable", tone: "muted" };
    default:
      return { label: "-", tone: "muted" };
  }
}

function getAvsCheckMeta(
  code: string | null | undefined,
  target: "street" | "zip",
): { label: string; tone: VerificationTone } {
  switch (code) {
    case "YYY":
    case "YYX":
    case "GGG":
      return { label: "Passed", tone: "success" };
    case "NYZ":
      return target === "zip"
        ? { label: "Passed", tone: "success" }
        : { label: "Failed", tone: "error" };
    case "YNA":
      return target === "street"
        ? { label: "Passed", tone: "success" }
        : { label: "Failed", tone: "error" };
    case "NNN":
      return { label: "Failed", tone: "error" };
    case "XXU":
    case "XXR":
    case "XXS":
      return { label: "Unavailable", tone: "muted" };
    default:
      return { label: "-", tone: "muted" };
  }
}

function VerificationValue({ label, tone }: { label: string; tone: VerificationTone }) {
  const icon =
    tone === "success" ? (
      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
    ) : tone === "error" ? (
      <XCircle className="h-3.5 w-3.5 text-red-400" />
    ) : (
      <Info className="h-3.5 w-3.5 text-zinc-500" />
    );

  const textClassName =
    tone === "success"
      ? "text-emerald-400"
      : tone === "error"
        ? "text-red-400"
        : "text-zinc-400";

  return (
    <span className={`inline-flex items-center gap-1.5 ${textClassName}`}>
      {icon}
      <span>{label}</span>
    </span>
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
  const [showAllSessionEntries, setShowAllSessionEntries] = useState(false);

  // Product detail modal
  const [selectedItem, setSelectedItem] = useState<AdminOrderItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/transactions/${orderId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError((data as { error?: string }).error ?? "Failed to load transaction");
          return;
        }
        const data = await res.json();
        setOrder(data.order);
        setPaymentTx(data.paymentTransaction);
        setPaymentEvents(data.paymentEvents ?? []);
        setEmailLogs(data.emailLogs ?? []);
        setTrackingEvents(data.trackingEvents ?? []);
      } catch {
        setError("Failed to load transaction");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [orderId]);

  const confirmRefund = async (payload: RefundRequestPayload) => {
    if (!order) {
      return;
    }
    setIsRefundSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success !== false) {
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
        const refreshRes = await fetch(`/api/admin/transactions/${orderId}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setOrder(refreshData.order);
          setPaymentTx(refreshData.paymentTransaction);
          setPaymentEvents(refreshData.paymentEvents ?? []);
          setEmailLogs(refreshData.emailLogs ?? []);
        }
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
      const res = await fetch(`/api/admin/orders/${order.id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ message: "Email resent successfully.", tone: "success" });
        const refreshRes = await fetch(`/api/admin/transactions/${orderId}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setEmailLogs(refreshData.emailLogs ?? []);
        }
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
          <ArrowLeft className="w-4 h-4" />
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
  const showOrderProfit = shouldShowOrderProfit(order.status);

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
  const billingAddressLines = paymentTx
    ? [
        paymentTx.billing_address,
        [paymentTx.billing_city, paymentTx.billing_state, paymentTx.billing_zip]
          .filter(Boolean)
          .join(", "),
        paymentTx.billing_country ? formatCountryName(paymentTx.billing_country) : null,
      ].filter((line): line is string => Boolean(line && line.trim()))
    : [];
  const cardNumberLabel = paymentTx?.card_last4 ? `.... ${paymentTx.card_last4}` : "-";
  const cardExpiryLabel =
    paymentTx?.card_expiry_month && paymentTx?.card_expiry_year
      ? `${String(paymentTx.card_expiry_month).padStart(2, "0")} / ${paymentTx.card_expiry_year}`
      : "-";
  const cardOrigin = paymentTx?.billing_country
    ? formatCountryName(paymentTx.billing_country)
    : "-";
  const cvvCheckMeta = getCvvCheckMeta(paymentTx?.cvv2_result_code);
  const streetCheckMeta = getAvsCheckMeta(paymentTx?.avs_result_code, "street");
  const zipCheckMeta = getAvsCheckMeta(paymentTx?.avs_result_code, "zip");

  // Session Activity: merged payment events + email sends, most-recent first
  const sessionTimeline: SessionEntry[] = [
    ...paymentEvents.map((e): SessionEntry => ({ kind: "payment", data: e })),
    ...emailLogs.map((e): SessionEntry => ({ kind: "email", data: e })),
  ].sort((a, b) => {
    const aTime = new Date(
      a.kind === "payment" ? a.data.created_at : a.data.sent_at,
    ).getTime();
    const bTime = new Date(
      b.kind === "payment" ? b.data.created_at : b.data.sent_at,
    ).getTime();
    return bTime - aTime;
  });

  // Email Checklist
  const isPickup = order.fulfillment === "pickup";
  const checklistTypes = isPickup ? PICKUP_EMAIL_TYPES : SHIPPING_EMAIL_TYPES;

  // Order successfully placed and paid
  const isOrderPlaced = [
    "paid",
    "shipped",
    "refunded",
    "partially_refunded",
    "refund_pending",
    "refund_failed",
  ].includes(order.status ?? "");
  // Payment was at least attempted (blocked/failed count)
  const paymentAttemptMade =
    isOrderPlaced || ["failed", "blocked", "review"].includes(order.status ?? "");
  const visibleSessionEntries = showAllSessionEntries
    ? sessionTimeline
    : sessionTimeline.slice(0, 4);
  const hiddenSessionEntryCount = Math.max(
    0,
    sessionTimeline.length - visibleSessionEntries.length,
  );
  /*

              <p className="mt-0.5 text-xs text-zinc-600">
                To: {log.recipient_email}{log.subject ? ` Â· "${log.subject}"` : ""}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">{fmtDate(log.sent_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  */
  const openItemModal = (item: OrderItem) => {
    setSelectedItem(item as unknown as AdminOrderItem);
    setItemModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/admin/transactions")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Transactions
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Transaction</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${statusMeta.cls}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Created {fmtDate(order.created_at)}
          </p>
          {order.updated_at && order.updated_at !== order.created_at && (
            <p className="text-zinc-600 text-xs mt-0.5">
              Updated {fmtDate(order.updated_at)}
            </p>
          )}
          {order.failure_reason && (
            <p className="text-red-400 text-sm mt-1">{order.failure_reason}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {isRefundable && (
            <button
              type="button"
              onClick={() => setRefundOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-sm transition"
            >
              Issue refund
            </button>
          )}
          {refundedCents > 0 && (
            <div className="text-right text-sm text-red-400">
              âˆ’{fmtMoney(refundedCents / 100)} refunded
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

      {/* â”€â”€ Price Breakdown â”€â”€ */}
      <SectionCard title="Price Breakdown">
        <div className="space-y-0">
          {items.map((item) => {
            const title =
              (item.product?.title_display ??
                `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()) ||
              "Item";
            const img =
              item.product?.images?.find((i) => i.is_primary)?.url ??
              item.product?.images?.[0]?.url ??
              "/images/rdk-logo.png";
            const isRefunded = Boolean(item.refunded_at);
            const showItemProfit = showOrderProfit && !isRefunded;
            const profit = (item.unit_price - (item.unit_cost ?? 0)) * item.quantity;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openItemModal(item)}
                className={`group -mx-2 flex w-full items-center gap-4 rounded-sm border border-transparent px-2 py-3 text-left transition-colors hover:border-zinc-700/80 hover:bg-zinc-800/50 ${isRefunded ? "opacity-50" : ""}`}
              >
                <div className="w-10 h-10 border border-zinc-800 bg-zinc-950 overflow-hidden shrink-0">
                  <img src={img} alt={title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{title}</p>
                  <p className="text-xs text-zinc-500">
                    {item.variant?.size_label ? `Size ${item.variant.size_label} - ` : ""}
                    Qty {item.quantity}
                    {isRefunded ? " - Refunded" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-white">{fmtMoney(item.line_total)}</p>
                  {showItemProfit && (
                    <p
                      className={`text-xs ${profit >= 0 ? "text-emerald-500" : "text-red-400"}`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {fmtMoney(profit)}
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
        <div className="pt-3 space-y-1.5 text-sm">
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
          <div className="flex justify-between text-zinc-400">
            <span>Processing fee ({PROCESSING_FEE_LABEL})</span>
            <span>{fmtMoney(processingFee)}</span>
          </div>
          {refundedCents > 0 && (
            <div className="flex justify-between text-red-400 text-xs">
              <span>Refunded</span>
              <span>-{fmtMoney(refundedCents / 100)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-semibold pt-2 border-t border-zinc-800/70">
            <span>Customer total</span>
            <span>{fmtMoney(displayTotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 text-xs">
            <span>Order total before fee</span>
            <span>{fmtMoney(total)}</span>
          </div>
        </div>
      </SectionCard>

      {/* â”€â”€ Session Activity â”€â”€ */}
      {false && (
        <SectionCard title="Session Activity">
          {sessionTimeline.length === 0 ? (
            <p className="text-zinc-500 text-sm">No activity recorded for this order.</p>
          ) : (
            <ol className="space-y-4">
              {sessionTimeline.map((entry) => {
                if (entry.kind === "payment") {
                  const event = entry.data;
                  const meta = getEventMeta(event.event_type, event.event_data);
                  return (
                    <li key={`payment-${event.id}`} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{meta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{meta.label}</p>
                        {meta.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {meta.description}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {fmtDate(event.created_at)}
                        </p>
                        {event.event_data && Object.keys(event.event_data).length > 0 && (
                          <details className="mt-1">
                            <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">
                              Raw data
                            </summary>
                            <pre className="mt-1 text-[11px] text-zinc-400 bg-zinc-950 border border-zinc-800/50 p-2 overflow-x-auto">
                              {JSON.stringify(event.event_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
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
                    key={`email-${log.id}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{emailMeta.icon}</div>
                      <div>
                        <p className="text-sm text-white">{emailMeta.label}</p>
                        <p className="text-xs text-zinc-500">
                          To: {log.recipient_email} Â· Sent{" "}
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
                        <span className={`text-xs ${deliveryColor} capitalize`}>
                          {log.delivery_status}
                        </span>
                      </div>
                    </div>
                    {log.html_snapshot && (
                      <button
                        type="button"
                        onClick={() => setEmailPreview(log)}
                        className="text-xs text-red-400 hover:text-red-300 whitespace-nowrap shrink-0 mt-0.5"
                      >
                        View email
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>
      )}

      {/* â”€â”€ Email Checklist (only for placed orders) â”€â”€ */}
      {isOrderPlaced && (
        <SectionCard title="Email Checklist">
          <p className="text-xs text-zinc-600 -mt-2 mb-4">
            {isPickup ? "Pickup order" : "Shipping order"} - Expected emails
          </p>
          <div className="space-y-0">
            {checklistTypes.map((emailType) => {
              const meta = getEmailTypeMeta(emailType);
              const matchingLogs = emailLogs.filter((l) => l.email_type === emailType);
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
                    <CheckCircle className="w-3 h-3" /> Delivered
                  </span>
                ) : latestLog.delivery_status === "failed" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-red-400">
                    <XCircle className="w-3 h-3" /> Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="w-3 h-3" /> Sent
                  </span>
                )
              ) : (
                <span className="text-xs text-zinc-600">Not sent</span>
              );

              const isResending = resendingEmail === emailType;

              return (
                <div
                  key={emailType}
                  className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800/50 last:border-0"
                >
                  <div>
                    <p className="text-sm text-white">{meta.label}</p>
                    {latestLog && (
                      <p className="text-xs text-zinc-500 mt-0.5">
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
                  <div className="flex items-center gap-3 shrink-0">
                    {latestLog?.html_snapshot && (
                      <button
                        type="button"
                        onClick={() => setEmailPreview(latestLog)}
                        className="text-xs text-zinc-400 hover:text-white transition-colors"
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
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`}
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

      {/* â”€â”€ Payment Method (only when payment was attempted) â”€â”€ */}
      {false && (
        <SectionCard title="Payment Method">
          {!paymentTx ? (
            <p className="text-zinc-500 text-sm">
              No payment data available for this order.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
                <div className="space-y-0">
                  <InlineDetailRow label="ID">
                    <span className="break-all font-mono text-xs">{paymentTx.id}</span>
                  </InlineDetailRow>
                  <InlineDetailRow label="Number">{cardNumberLabel}</InlineDetailRow>
                  <InlineDetailRow label="Expires">{cardExpiryLabel}</InlineDetailRow>
                  <InlineDetailRow label="Type">
                    {paymentTx.card_type ?? "-"}
                  </InlineDetailRow>
                  <InlineDetailRow label="Reference">
                    {paymentTx.payrilla_reference_number?.toString() ?? "-"}
                  </InlineDetailRow>
                  <InlineDetailRow label="Auth code">
                    {paymentTx.payrilla_auth_code ?? "-"}
                  </InlineDetailRow>
                </div>
                <div className="space-y-0">
                  <InlineDetailRow label="Owner">
                    {paymentTx.billing_name ?? "-"}
                  </InlineDetailRow>
                  <InlineDetailRow label="Owner email">
                    {customerEmail ?? "-"}
                  </InlineDetailRow>
                  <InlineDetailRow label="Address">
                    {billingAddressLines.length > 0 ? (
                      <div className="space-y-0.5">
                        {billingAddressLines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </InlineDetailRow>
                  <InlineDetailRow label="Origin">{cardOrigin}</InlineDetailRow>
                  <InlineDetailRow label="CVV check">
                    <VerificationValue
                      label={cvvCheckMeta.label}
                      tone={cvvCheckMeta.tone}
                    />
                  </InlineDetailRow>
                  <InlineDetailRow label="Street check">
                    <VerificationValue
                      label={streetCheckMeta.label}
                      tone={streetCheckMeta.tone}
                    />
                  </InlineDetailRow>
                  <InlineDetailRow label="Zip check">
                    <VerificationValue
                      label={zipCheckMeta.label}
                      tone={zipCheckMeta.tone}
                    />
                  </InlineDetailRow>
                </div>
              </div>
              <div className="grid gap-4 border-t border-zinc-800/60 pt-4 md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    Processor
                  </p>
                  <p className="mt-1 text-sm capitalize text-gray-200">
                    {paymentTx.payrilla_status?.replace(/_/g, " ") ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    Fraud Check
                  </p>
                  <div className="mt-1">
                    {getNoFraudBadge(paymentTx.nofraud_decision)}
                  </div>
                </div>
                {paymentTx.amount_authorized !== null &&
                  paymentTx.amount_authorized !== undefined && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Authorized
                      </p>
                      <p className="mt-1 text-sm text-gray-200">
                        {fmtMoney(paymentTx.amount_authorized)}
                      </p>
                    </div>
                  )}
                {paymentTx.amount_captured !== null &&
                  paymentTx.amount_captured !== undefined && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Captured
                      </p>
                      <p className="mt-1 text-sm text-gray-200">
                        {fmtMoney(paymentTx.amount_captured)}
                      </p>
                    </div>
                  )}
                {paymentTx.nofraud_transaction_id && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Review ID
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-gray-200">
                      {paymentTx.nofraud_transaction_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {false && (
        <SectionCard title="Payment Method">
          {!paymentTx ? (
            <p className="text-zinc-500 text-sm">
              No payment data available for this order.
            </p>
          ) : (
            <div className="space-y-0">
              <DetailRow label="Payment ID">
                <span className="font-mono text-xs">{paymentTx.id}</span>
              </DetailRow>
              <DetailRow label="Reference #">
                {paymentTx.payrilla_reference_number?.toString() ?? "â€”"}
              </DetailRow>
              <DetailRow label="Card type">{paymentTx.card_type ?? "â€”"}</DetailRow>
              <DetailRow label="Last 4">
                {paymentTx.card_last4 ? `Â·Â·Â·Â· ${paymentTx.card_last4}` : "â€”"}
              </DetailRow>
              <DetailRow label="Expires">
                {paymentTx.card_expiry_month && paymentTx.card_expiry_year
                  ? `${String(paymentTx.card_expiry_month).padStart(2, "0")} / ${paymentTx.card_expiry_year}`
                  : "â€”"}
              </DetailRow>
              <DetailRow label="Cardholder">{paymentTx.billing_name ?? "â€”"}</DetailRow>
              <DetailRow label="Owner email">{customerEmail ?? "â€”"}</DetailRow>
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
              <DetailRow label="Billing address">
                {[
                  paymentTx.billing_address,
                  paymentTx.billing_city,
                  paymentTx.billing_state,
                  paymentTx.billing_zip,
                  paymentTx.billing_country,
                ]
                  .filter(Boolean)
                  .join(", ") || "â€”"}
              </DetailRow>
              <DetailRow label="Customer IP">{paymentTx.customer_ip ?? "â€”"}</DetailRow>
              <DetailRow label="Auth code">
                {paymentTx.payrilla_auth_code ?? "â€”"}
              </DetailRow>
              <DetailRow label="NoFraud decision">
                {getNoFraudBadge(paymentTx.nofraud_decision)}
              </DetailRow>
              {paymentTx.nofraud_transaction_id && (
                <DetailRow label="NoFraud ID">
                  {paymentTx.nofraud_transaction_id}
                </DetailRow>
              )}
              <DetailRow label="Amount authorized">
                {paymentTx.amount_authorized !== null &&
                paymentTx.amount_authorized !== undefined
                  ? fmtMoney(paymentTx.amount_authorized)
                  : "â€”"}
              </DetailRow>
              <DetailRow label="Amount captured">
                {paymentTx.amount_captured !== null &&
                paymentTx.amount_captured !== undefined
                  ? fmtMoney(paymentTx.amount_captured)
                  : "â€”"}
              </DetailRow>
            </div>
          )}
        </SectionCard>
      )}

      {/* â”€â”€ Shipping Details (only when payment was attempted and order is shipping) â”€â”€ */}
      {paymentAttemptMade && (
        <SectionCard title="Payment Method">
          {!paymentTx ? (
            <p className="text-zinc-500 text-sm">
              No payment data available for this order.
            </p>
          ) : (
            <div className="space-y-0">
              <DetailRow label="Payment ID">
                <span className="font-mono text-xs">{paymentTx.id}</span>
              </DetailRow>
              <DetailRow label="Reference #">
                {paymentTx.payrilla_reference_number?.toString() ?? "-"}
              </DetailRow>
              <DetailRow label="Card type">{paymentTx.card_type ?? "-"}</DetailRow>
              <DetailRow label="Last 4">
                {paymentTx.card_last4 ? `.... ${paymentTx.card_last4}` : "-"}
              </DetailRow>
              <DetailRow label="Expires">
                {paymentTx.card_expiry_month && paymentTx.card_expiry_year
                  ? `${String(paymentTx.card_expiry_month).padStart(2, "0")} / ${paymentTx.card_expiry_year}`
                  : "-"}
              </DetailRow>
              <DetailRow label="Cardholder">{paymentTx.billing_name ?? "-"}</DetailRow>
              <DetailRow label="Owner email">{customerEmail ?? "-"}</DetailRow>
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
              <DetailRow label="Customer IP">{paymentTx.customer_ip ?? "-"}</DetailRow>
              <DetailRow label="Auth code">
                {paymentTx.payrilla_auth_code ?? "-"}
              </DetailRow>
              <DetailRow label="NoFraud decision">
                {getNoFraudBadge(paymentTx.nofraud_decision)}
              </DetailRow>
              {paymentTx.nofraud_transaction_id && (
                <DetailRow label="NoFraud ID">
                  {paymentTx.nofraud_transaction_id}
                </DetailRow>
              )}
              <DetailRow label="Amount authorized">
                {paymentTx.amount_authorized !== null &&
                paymentTx.amount_authorized !== undefined
                  ? fmtMoney(paymentTx.amount_authorized)
                  : "-"}
              </DetailRow>
              <DetailRow label="Amount captured">
                {paymentTx.amount_captured !== null &&
                paymentTx.amount_captured !== undefined
                  ? fmtMoney(paymentTx.amount_captured)
                  : "-"}
              </DetailRow>
            </div>
          )}
        </SectionCard>
      )}

      {order.fulfillment === "ship" && paymentAttemptMade && (
        <SectionCard title="Shipping">
          <div className="space-y-0">
            {shippingAddr ? (
              <>
                <DetailRow label="Recipient">{shippingAddr.name ?? "-"}</DetailRow>
                {shippingAddr.phone && (
                  <DetailRow label="Phone">{shippingAddr.phone}</DetailRow>
                )}
                {(shippingAddr.line1 || shippingAddr.city) && (
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
                      .join(", ")}
                  </DetailRow>
                )}
              </>
            ) : (
              <DetailRow label="Recipient">-</DetailRow>
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
                  Download <ExternalLink className="w-3 h-3" />
                </a>
              </DetailRow>
            )}
          </div>
          {trackingEvents.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
                Tracking Events
              </p>
              <ol className="space-y-3">
                {trackingEvents.map((te) => (
                  <li key={te.id} className="flex items-start gap-3">
                    <Truck className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white capitalize">
                        {te.status.replace(/_/g, " ")}
                      </p>
                      {te.description && (
                        <p className="text-xs text-zinc-400">{te.description}</p>
                      )}
                      {te.location && (
                        <p className="text-xs text-zinc-500">{te.location}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {fmtDate(te.event_timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </SectionCard>
      )}

      {/* â”€â”€ Logs â”€â”€ */}
      <SectionCard title="Session Activity">
        {sessionTimeline.length === 0 ? (
          <p className="text-zinc-500 text-sm">No activity recorded for this order.</p>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-4">
              {visibleSessionEntries.map((entry) => {
                if (entry.kind === "payment") {
                  const event = entry.data;
                  const meta = getEventMeta(event.event_type, event.event_data);
                  return (
                    <li key={`payment-${event.id}`} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{meta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{meta.label}</p>
                        {meta.description && (
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {meta.description}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {fmtDate(event.created_at)}
                        </p>
                      </div>
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
                    key={`email-${log.id}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{emailMeta.icon}</div>
                      <div>
                        <p className="text-sm text-white">{emailMeta.label}</p>
                        <p className="text-xs text-zinc-500">To: {log.recipient_email}</p>
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
                    {log.html_snapshot && (
                      <button
                        type="button"
                        onClick={() => setEmailPreview(log)}
                        className="mt-0.5 shrink-0 whitespace-nowrap text-xs text-red-400 hover:text-red-300"
                      >
                        View email
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>

            {sessionTimeline.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllSessionEntries((current) => !current)}
                className="text-sm text-red-400 transition hover:text-red-300"
              >
                {showAllSessionEntries
                  ? "Show less"
                  : `Show ${hiddenSessionEntryCount} more activit${hiddenSessionEntryCount === 1 ? "y" : "ies"}`}
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/*
      <SectionCard title="Logs">
        {allLogs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No logs recorded for this order.</p>
        ) : (
          <div className="space-y-0">
            {previewLogs.map((entry) => {
              if (entry.kind === "api") {
                const log = entry.data;
                const isError = log.http_status != null && log.http_status >= 400;
                const statusColor = isError ? "text-red-400" : "text-emerald-400";
                return (
                  <div key={`api-${log.id}`} className="flex items-start gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
                    <Terminal className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-zinc-200">{log.event_label ?? log.route}</span>
                        {log.http_status != null && (
                          <span className={`text-xs font-mono ${statusColor}`}>{log.http_status}</span>
                        )}
                        {log.duration_ms != null && (
                          <span className="text-xs text-zinc-600">{log.duration_ms}ms</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 font-mono mt-0.5">{log.method} {log.route}</p>
                      {log.error_message && (
                        <p className="text-xs text-red-400 mt-0.5">{log.error_message}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-0.5">{fmtDate(log.created_at)}</p>
                      <PayloadDetails label="Request" payload={log.request_payload} />
                      <PayloadDetails label="Response" payload={log.response_payload} />
                    </div>
                  </div>
                );
              }
              const log = entry.data;
              const emailMeta = getEmailTypeMeta(log.email_type);
              const isFailure = log.delivery_status === "failed";
              return (
                <div key={`email-${log.id}`} className="flex items-start gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
                  <div className="mt-0.5 shrink-0">{emailMeta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-zinc-200">{emailMeta.label}</span>
                      <span className={`text-xs capitalize ${isFailure ? "text-red-400" : "text-zinc-500"}`}>
                        {log.delivery_status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      To: {log.recipient_email}{log.subject ? ` Â· "${log.subject}"` : ""}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{fmtDate(log.sent_at)}</p>
                  </div>
                </div>
              );
            })}
            {hasMoreLogs && (
              <button
                type="button"
                onClick={() => setLogsDrawerOpen(true)}
                className="mt-4 text-sm text-red-400 transition hover:text-red-300"
              >
                View {allLogs.length - previewLogs.length} more log{allLogs.length - previewLogs.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        )}
      </SectionCard>

      */}
      {refundedCents > 0 && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 text-sm text-amber-400">
          {fmtMoney(refundedCents / 100)} has been refunded on this order.
          {order.refunded_at && (
            <span className="text-zinc-500 ml-1">({fmtDate(order.refunded_at)})</span>
          )}
        </div>
      )}

      {/*
      <Drawer
        isOpen={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        title="All Logs"
        subtitle={`${allLogs.length} total ${allLogs.length === 1 ? "entry" : "entries"}`}
        side="bottom"
        heightClassName="max-h-[75vh]"
      >
        {allLogs.length === 0 ? (
          <p className="text-sm text-zinc-500">No logs recorded for this order.</p>
        ) : (
          renderLogEntries(allLogs)
        )}
      </Drawer>
      */}

      {/* Email preview modal */}
      {emailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
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
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={emailPreview.html_snapshot ?? ""}
                title="Email preview"
                className="w-full h-full min-h-[500px]"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Refund modal */}
      <RefundOrderModal
        open={refundOpen}
        order={refundableOrder}
        submitting={isRefundSubmitting}
        onClose={() => setRefundOpen(false)}
        onConfirm={confirmRefund}
      />

      {/* Product detail modal */}
      <AdminOrderItemDetailsModal
        open={itemModalOpen}
        item={selectedItem}
        showProfit={showOrderProfit && !Boolean(selectedItem?.refunded_at)}
        onClose={() => {
          setItemModalOpen(false);
          setSelectedItem(null);
        }}
      />

      {/* Toast */}
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
