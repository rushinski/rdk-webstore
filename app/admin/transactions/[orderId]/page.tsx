// app/admin/transactions/[orderId]/page.tsx
// Full transaction detail page: price breakdown, checkout activity, email history,
// payment method, shipping details, and refund.
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
} from "lucide-react";

import {
  RefundOrderModal,
  type RefundRequestPayload,
  type RefundableOrder,
} from "@/components/admin/orders/RefundOrderModal";
import { Toast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

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
    images?: ProductImage[];
  } | null;
  variant?: { id: string; size_label?: string | null } | null;
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
  guest_email?: string | null;
  failure_reason?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  label_url?: string | null;
  label_created_at?: string | null;
  profiles?: { email?: string | null; full_name?: string | null } | null;
  items?: OrderItem[];
  shipping: OrderShipping | OrderShipping[] | null;
};

type PaymentTransaction = {
  id: string;
  payrilla_reference_number?: number | null;
  payrilla_auth_code?: string | null;
  payrilla_status?: string | null;
  card_type?: string | null;
  card_last4?: string | null;
  card_bin?: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtMoney = (v: number | null | undefined) => fmt.format(Number(v ?? 0));

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    ...opts,
  });
}

function getOrderStatusMeta(status: string | null | undefined) {
  switch (status) {
    case "paid": return { label: "Paid", cls: "bg-emerald-900/50 text-emerald-400 border-emerald-800" };
    case "shipped": return { label: "Shipped", cls: "bg-blue-900/50 text-blue-400 border-blue-800" };
    case "refunded": return { label: "Refunded", cls: "bg-red-900/50 text-red-400 border-red-800" };
    case "partially_refunded": return { label: "Partially refunded", cls: "bg-amber-900/50 text-amber-400 border-amber-800" };
    case "refund_pending": return { label: "Refund pending", cls: "bg-amber-900/50 text-amber-400 border-amber-800" };
    case "refund_failed": return { label: "Refund failed", cls: "bg-rose-900/50 text-rose-400 border-rose-800" };
    case "failed": return { label: "Failed", cls: "bg-red-900/50 text-red-400 border-red-800" };
    case "blocked": return { label: "Blocked", cls: "bg-orange-900/50 text-orange-400 border-orange-800" };
    case "review": return { label: "Under review", cls: "bg-yellow-900/50 text-yellow-400 border-yellow-800" };
    case "pending": return { label: "Incomplete", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    default: return { label: status ?? "Unknown", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  }
}

function getAvsLabel(code: string | null | undefined) {
  if (!code) return { label: "—", color: "text-zinc-500" };
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
  if (!code) return { label: "—", color: "text-zinc-500" };
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
  if (!decision) return <span className="text-zinc-500">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    pass: { label: "Pass", cls: "bg-emerald-900/50 text-emerald-400 border-emerald-800" },
    fail: { label: "Fail", cls: "bg-red-900/50 text-red-400 border-red-800" },
    review: { label: "Review", cls: "bg-amber-900/50 text-amber-400 border-amber-800" },
    fraudulent: { label: "Fraudulent", cls: "bg-red-900/50 text-red-400 border-red-800" },
    skipped: { label: "Skipped (down)", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  };
  const meta = map[decision] ?? { label: decision, cls: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function getEventMeta(type: string): { icon: React.ReactNode; label: string } {
  switch (type) {
    case "payment_started": return { icon: <Info className="w-4 h-4 text-zinc-400" />, label: "Checkout started" };
    case "3ds_completed": return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "3D Secure completed" };
    case "authorization_approved": return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Payment authorized" };
    case "authorization_declined": return { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Authorization declined" };
    case "authorization_error": return { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, label: "Authorization error" };
    case "fraud_check_pass": return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Fraud screening passed" };
    case "fraud_check_fail": return { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Fraud screening failed" };
    case "fraud_check_review": return { icon: <Clock className="w-4 h-4 text-amber-400" />, label: "Under review — NoFraud investigating" };
    case "fraud_check_skipped": return { icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, label: "Fraud screening skipped (service unavailable)" };
    case "fraud_review_resolved": return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Fraud review resolved" };
    case "payment_captured": return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Payment captured" };
    case "payment_voided": return { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Payment voided" };
    case "payment_refunded": return { icon: <Info className="w-4 h-4 text-blue-400" />, label: "Full refund issued" };
    case "payment_refund_partial": return { icon: <Info className="w-4 h-4 text-blue-400" />, label: "Partial refund issued" };
    case "webhook_received": return { icon: <Info className="w-4 h-4 text-zinc-400" />, label: "Webhook received" };
    default: return { icon: <Info className="w-4 h-4 text-zinc-400" />, label: type.replace(/_/g, " ") };
  }
}

function getEmailTypeMeta(type: string): { label: string; icon: React.ReactNode } {
  switch (type) {
    case "order_confirmation": return { label: "Order confirmation", icon: <Package className="w-4 h-4 text-blue-400" /> };
    case "order_refunded": return { label: "Refund confirmation", icon: <Info className="w-4 h-4 text-red-400" /> };
    case "label_created": return { label: "Label created", icon: <Truck className="w-4 h-4 text-zinc-400" /> };
    case "in_transit": return { label: "In transit", icon: <Truck className="w-4 h-4 text-blue-400" /> };
    case "delivered": return { label: "Delivered", icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> };
    case "pickup_instructions": return { label: "Pickup instructions", icon: <Package className="w-4 h-4 text-zinc-400" /> };
    default: return { label: type.replace(/_/g, " "), icon: <Mail className="w-4 h-4 text-zinc-400" /> };
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded p-5 space-y-1">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

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
    if (!order) return;
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
          payload.type === "full" ? "Full refund processed."
          : payload.type === "product" ? "Product refund processed."
          : "Custom refund processed.";
        const warning = typeof data?.warning === "string" ? data.warning : null;
        setToast({ message: warning ? `${label} ${warning}` : label, tone: warning ? "info" : "success" });
        setRefundOpen(false);
        // Reload data
        const refreshRes = await fetch(`/api/admin/transactions/${orderId}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setOrder(refreshData.order);
          setPaymentTx(refreshData.paymentTransaction);
          setPaymentEvents(refreshData.paymentEvents ?? []);
          setEmailLogs(refreshData.emailLogs ?? []);
        }
      } else {
        setToast({ message: (data as { error?: string }).error ?? "Refund failed.", tone: "error" });
      }
    } catch {
      setToast({ message: "Refund failed.", tone: "error" });
    } finally {
      setIsRefundSubmitting(false);
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
  const shippingAddr = Array.isArray(order.shipping) ? order.shipping[0] : order.shipping;
  const items = order.items ?? [];
  const subtotal = Number(order.subtotal ?? 0);
  const shipping = Number((order as { shipping_cost?: number | null } & Order).shipping ?? 0);
  const tax = Number(order.tax_amount ?? 0);
  const total = Number(order.total ?? 0);
  const refundedCents = Math.round(Number(order.refund_amount ?? 0));

  const isRefundable =
    ["paid", "shipped", "partially_refunded", "refund_failed"].includes(order.status ?? "") &&
    Math.round(total * 100) - refundedCents > 0;

  const refundableOrder: RefundableOrder = {
    id: order.id,
    total: order.total,
    refund_amount: order.refund_amount,
    items: items as unknown as RefundableOrder["items"],
  };

  const customerEmail =
    order.profiles?.email ?? order.guest_email ?? paymentTx?.customer_email ?? null;

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
            <h1 className="text-2xl font-bold text-white font-mono">
              #{order.id.slice(0, 8)}
            </h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.cls}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{fmtDate(order.created_at)}</p>
          {order.failure_reason && (
            <p className="text-red-400 text-sm mt-1">{order.failure_reason}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{fmtMoney(total)}</div>
          {refundedCents > 0 && (
            <div className="text-sm text-red-400 mt-0.5">
              −{fmtMoney(refundedCents / 100)} refunded
            </div>
          )}
        </div>
      </div>

      {/* ── Price Breakdown ── */}
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
            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 py-3 border-b border-zinc-800/50 last:border-0 ${isRefunded ? "opacity-50" : ""}`}
              >
                <div className="w-10 h-10 rounded border border-zinc-800 bg-zinc-950 overflow-hidden shrink-0">
                  <img src={img} alt={title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{title}</p>
                  <p className="text-xs text-zinc-500">
                    {item.variant?.size_label ? `Size ${item.variant.size_label} · ` : ""}
                    Qty {item.quantity}
                    {isRefunded ? " · Refunded" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-white">{fmtMoney(item.line_total)}</p>
                  <p className="text-xs text-zinc-500">{fmtMoney(item.unit_price)} ea.</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{fmtMoney(subtotal)}</span>
          </div>
          {shipping > 0 && (
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
          <div className="flex justify-between text-white font-semibold pt-2 border-t border-zinc-800/70">
            <span>Total</span>
            <span>{fmtMoney(total)}</span>
          </div>
          {refundedCents > 0 && (
            <div className="flex justify-between text-red-400 text-xs">
              <span>Refunded</span>
              <span>−{fmtMoney(refundedCents / 100)}</span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Checkout Activity ── */}
      <SectionCard title="Checkout Activity">
        {paymentEvents.length === 0 ? (
          <p className="text-zinc-500 text-sm">No activity recorded for this order.</p>
        ) : (
          <ol className="space-y-4">
            {paymentEvents.map((event, i) => {
              const meta = getEventMeta(event.event_type);
              return (
                <li key={event.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{meta.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{fmtDate(event.created_at)}</p>
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">
                          Details
                        </summary>
                        <pre className="mt-1 text-[11px] text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  {i < paymentEvents.length - 1 && (
                    <div className="absolute left-[1.75rem] mt-6 w-px h-4 bg-zinc-700" />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>

      {/* ── Email Activity ── */}
      <SectionCard title="Email Activity">
        {emailLogs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No emails sent for this order.</p>
        ) : (
          <div className="space-y-3">
            {emailLogs.map((log) => {
              const meta = getEmailTypeMeta(log.email_type);
              const deliveryColor =
                log.delivery_status === "delivered"
                  ? "text-emerald-400"
                  : log.delivery_status === "failed"
                  ? "text-red-400"
                  : "text-zinc-400";
              return (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-4 py-3 border-b border-zinc-800/50 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{meta.icon}</div>
                    <div>
                      <p className="text-sm text-white">{meta.label}</p>
                      <p className="text-xs text-zinc-500">
                        To: {log.recipient_email} · Sent {fmtDate(log.sent_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                      {log.delivered_at && (
                        <p className="text-xs text-zinc-500">
                          Delivered {fmtDate(log.delivered_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                      {log.opened_at && (
                        <p className="text-xs text-emerald-500">
                          Opened {fmtDate(log.opened_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Payment Method ── */}
      <SectionCard title="Payment Method">
        {!paymentTx ? (
          <p className="text-zinc-500 text-sm">No payment data available for this order.</p>
        ) : (
          <div className="space-y-0">
            <DetailRow label="Card type">{paymentTx.card_type ?? "—"}</DetailRow>
            <DetailRow label="Last 4">
              {paymentTx.card_last4 ? `···· ${paymentTx.card_last4}` : "—"}
            </DetailRow>
            <DetailRow label="Expires">
              {paymentTx.card_expiry_month && paymentTx.card_expiry_year
                ? `${String(paymentTx.card_expiry_month).padStart(2, "0")} / ${paymentTx.card_expiry_year}`
                : "—"}
            </DetailRow>
            <DetailRow label="BIN (first 8)">{paymentTx.card_bin ?? "—"}</DetailRow>
            <DetailRow label="Cardholder">{paymentTx.billing_name ?? "—"}</DetailRow>
            <DetailRow label="Owner email">{customerEmail ?? "—"}</DetailRow>
            <DetailRow label="Issuer">—</DetailRow>
            <DetailRow label="Card origin">—</DetailRow>
            <DetailRow label="Fingerprint">—</DetailRow>
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
                .join(", ") || "—"}
            </DetailRow>
            <DetailRow label="Customer IP">{paymentTx.customer_ip ?? "—"}</DetailRow>
            <DetailRow label="Auth code">{paymentTx.payrilla_auth_code ?? "—"}</DetailRow>
            <DetailRow label="Reference #">
              {paymentTx.payrilla_reference_number?.toString() ?? "—"}
            </DetailRow>
            <DetailRow label="NoFraud decision">
              {getNoFraudBadge(paymentTx.nofraud_decision)}
            </DetailRow>
            {paymentTx.nofraud_transaction_id && (
              <DetailRow label="NoFraud ID">{paymentTx.nofraud_transaction_id}</DetailRow>
            )}
            <DetailRow label="Amount authorized">
              {paymentTx.amount_authorized != null ? fmtMoney(paymentTx.amount_authorized) : "—"}
            </DetailRow>
            <DetailRow label="Amount captured">
              {paymentTx.amount_captured != null ? fmtMoney(paymentTx.amount_captured) : "—"}
            </DetailRow>
          </div>
        )}
      </SectionCard>

      {/* ── Shipping Details ── */}
      {order.fulfillment === "ship" && (
        <SectionCard title="Shipping">
          <div className="space-y-0">
            {shippingAddr ? (
              <>
                <DetailRow label="Ship to">
                  {[
                    shippingAddr.name,
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
                {shippingAddr.phone && (
                  <DetailRow label="Phone">{shippingAddr.phone}</DetailRow>
                )}
              </>
            ) : (
              <DetailRow label="Ship to">—</DetailRow>
            )}
            <DetailRow label="Carrier">{order.shipping_carrier ?? "—"}</DetailRow>
            <DetailRow label="Tracking #">{order.tracking_number ?? "—"}</DetailRow>
            {order.label_created_at && (
              <DetailRow label="Label created">{fmtDate(order.label_created_at)}</DetailRow>
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
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Tracking Events</p>
              <ol className="space-y-3">
                {trackingEvents.map((te) => (
                  <li key={te.id} className="flex items-start gap-3">
                    <Truck className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white capitalize">{te.status.replace(/_/g, " ")}</p>
                      {te.description && (
                        <p className="text-xs text-zinc-400">{te.description}</p>
                      )}
                      {te.location && (
                        <p className="text-xs text-zinc-500">{te.location}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-0.5">{fmtDate(te.event_timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Refund ── */}
      <SectionCard title="Refund">
        {!isRefundable && refundedCents === 0 && (
          <p className="text-zinc-500 text-sm">This transaction is not eligible for a refund.</p>
        )}
        {refundedCents > 0 && (
          <p className="text-sm text-amber-400 mb-3">
            {fmtMoney(refundedCents / 100)} has already been refunded.
          </p>
        )}
        {isRefundable && (
          <button
            type="button"
            onClick={() => setRefundOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm transition"
          >
            Issue refund
          </button>
        )}
      </SectionCard>

      {/* Email preview modal */}
      {emailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded w-full max-w-2xl max-h-[90vh] flex flex-col">
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

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
