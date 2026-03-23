// app/admin/orders/[orderId]/page.tsx
//
// Seller order detail page — payment info, verification results, event timeline.
// Mirrors the Stripe dashboard order detail view but scoped to PayRilla + NoFraud.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Info,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentTransaction = {
  id: string;
  order_id: string;
  payrilla_reference_number: number | null;
  payrilla_auth_code: string | null;
  payrilla_status: string;
  card_type: string | null;
  card_last4: string | null;
  avs_result_code: string | null;
  cvv2_result_code: string | null;
  three_ds_status: string | null;
  three_ds_eci: string | null;
  nofraud_transaction_id: string | null;
  nofraud_decision: string | null;
  amount_requested: number;
  amount_authorized: number | null;
  amount_captured: number | null;
  amount_refunded: number;
  currency: string;
  billing_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  customer_email: string | null;
  customer_ip: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function getPaymentStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    captured: { label: "Succeeded", className: "bg-emerald-900/50 text-emerald-400 border-emerald-800" },
    authorized: { label: "Authorized", className: "bg-blue-900/50 text-blue-400 border-blue-800" },
    voided: { label: "Voided", className: "bg-zinc-800 text-zinc-400 border-zinc-700" },
    declined: { label: "Declined", className: "bg-red-900/50 text-red-400 border-red-800" },
    error: { label: "Error", className: "bg-red-900/50 text-red-400 border-red-800" },
    pending: { label: "Incomplete", className: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  };
  const meta = map[status] ?? { label: status, className: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function getNoFraudBadge(decision: string | null) {
  if (!decision) return <span className="text-zinc-500 text-xs">—</span>;
  const map: Record<string, { label: string; className: string }> = {
    pass: { label: "Pass", className: "bg-emerald-900/50 text-emerald-400 border-emerald-800" },
    fail: { label: "Fail", className: "bg-red-900/50 text-red-400 border-red-800" },
    review: { label: "Review", className: "bg-amber-900/50 text-amber-400 border-amber-800" },
    fraudulent: { label: "Fraudulent", className: "bg-red-900/50 text-red-400 border-red-800" },
  };
  const meta = map[decision] ?? { label: decision, className: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function getAvsLabel(code: string | null) {
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

function getCvvLabel(code: string | null) {
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

function get3DSLabel(status: string | null, eci: string | null) {
  if (!status) return { label: "—", color: "text-zinc-500" };
  const eciStr = eci ? `, ECI: ${eci}` : "";
  const map: Record<string, { label: string; color: string }> = {
    Y: { label: `Authenticated (Y)${eciStr}`, color: "text-emerald-400" },
    A: { label: `Attempted (A)${eciStr}`, color: "text-emerald-400" },
    N: { label: `Not authenticated (N)${eciStr}`, color: "text-red-400" },
    R: { label: `Rejected (R)${eciStr}`, color: "text-red-400" },
    U: { label: `Unavailable (U)${eciStr}`, color: "text-amber-400" },
    C: { label: `Challenge required (C)${eciStr}`, color: "text-amber-400" },
  };
  return map[status] ?? { label: `${status}${eciStr}`, color: "text-zinc-400" };
}

function getEventMeta(eventType: string): {
  icon: React.ReactNode;
  label: string;
} {
  switch (eventType) {
    case "payment_started":
      return { icon: <Info className="w-4 h-4 text-zinc-400" />, label: "Payment started" };
    case "3ds_completed":
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "3D Secure completed" };
    case "authorization_approved":
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Payment authorized" };
    case "authorization_declined":
      return { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Authorization declined" };
    case "authorization_error":
      return { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, label: "Authorization error" };
    case "fraud_check_pass":
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Fraud screening passed" };
    case "fraud_check_fail":
      return { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Fraud screening failed" };
    case "fraud_check_review":
      return { icon: <Clock className="w-4 h-4 text-amber-400" />, label: "Under review — NoFraud investigating" };
    case "fraud_review_resolved":
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Fraud review resolved" };
    case "payment_captured":
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: "Payment captured" };
    case "payment_voided":
      return { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Payment voided" };
    case "payment_refunded":
      return { icon: <Info className="w-4 h-4 text-blue-400" />, label: "Payment refunded" };
    case "payment_refund_partial":
      return { icon: <Info className="w-4 h-4 text-blue-400" />, label: "Partial refund" };
    case "webhook_received":
      return { icon: <Info className="w-4 h-4 text-zinc-400" />, label: "Webhook received" };
    default:
      return { icon: <Info className="w-4 h-4 text-zinc-400" />, label: eventType };
  }
}

function getEventSubDetail(event: PaymentEvent): string | null {
  const d = event.event_data;
  if (event.event_type === "authorization_approved" && d) {
    const parts: string[] = [];
    if (d.avsResultCode) parts.push(`AVS: ${d.avsResultCode}`);
    if (d.cvv2ResultCode) parts.push(`CVV: ${d.cvv2ResultCode}`);
    if (d.authAmount) parts.push(`$${(d.authAmount as number).toFixed(2)}`);
    return parts.join(" | ") || null;
  }
  if (event.event_type === "fraud_check_pass" || event.event_type === "fraud_check_fail" || event.event_type === "fraud_check_review") {
    return d.decision ? `NoFraud: ${String(d.decision)}` : null;
  }
  if (event.event_type === "3ds_completed") {
    return d.status ? `Status: ${String(d.status)}` : null;
  }
  return null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrderPaymentDetailPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params.orderId;

  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/payment-events`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string };
          setError(data.error ?? "Failed to load payment data");
          return;
        }
        const data = await res.json() as { transaction: PaymentTransaction | null; events: PaymentEvent[] };
        setTransaction(data.transaction);
        setEvents(data.events ?? []);
      } catch {
        setError("Network error loading payment data");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        Loading payment details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/60 bg-red-950/20 p-6 text-red-400">
        {error}
      </div>
    );
  }

  const tx = transaction;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to orders
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-white">
              {tx ? formatCurrency(tx.amount_requested, tx.currency) : "—"}
            </span>
            {tx && getPaymentStatusBadge(tx.payrilla_status)}
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Order <span className="font-mono text-zinc-300">{orderId}</span>
          </p>
          {tx?.customer_email && (
            <p className="text-sm text-zinc-400">{tx.customer_email}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Verification + Breakdown */}
        <div className="lg:col-span-2 space-y-6">

          {/* Verification Results */}
          {tx && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">
                Verification Results
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-zinc-500 shrink-0">AVS Result</span>
                  <span className={`text-right ${getAvsLabel(tx.avs_result_code).color}`}>
                    {getAvsLabel(tx.avs_result_code).label}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-zinc-500 shrink-0">CVV Result</span>
                  <span className={`text-right ${getCvvLabel(tx.cvv2_result_code).color}`}>
                    {getCvvLabel(tx.cvv2_result_code).label}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-zinc-500 shrink-0">3D Secure</span>
                  <span className={`text-right ${get3DSLabel(tx.three_ds_status, tx.three_ds_eci).color}`}>
                    {get3DSLabel(tx.three_ds_status, tx.three_ds_eci).label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Breakdown */}
          {tx && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">
                Payment Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Requested</span>
                  <span className="text-zinc-200">{formatCurrency(tx.amount_requested, tx.currency)}</span>
                </div>
                {tx.amount_authorized != null && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Authorized</span>
                    <span className="text-zinc-200">{formatCurrency(tx.amount_authorized, tx.currency)}</span>
                  </div>
                )}
                {tx.amount_captured != null && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Captured</span>
                    <span className="text-emerald-400">{formatCurrency(tx.amount_captured, tx.currency)}</span>
                  </div>
                )}
                {tx.amount_refunded > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Refunded</span>
                    <span className="text-blue-400">−{formatCurrency(tx.amount_refunded, tx.currency)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing Info */}
          {tx && (tx.billing_name || tx.billing_address) && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">
                Billing Address
              </h3>
              <div className="text-sm text-zinc-300 space-y-0.5">
                {tx.billing_name && <p className="font-medium">{tx.billing_name}</p>}
                {tx.billing_address && <p>{tx.billing_address}</p>}
                {(tx.billing_city || tx.billing_state || tx.billing_zip) && (
                  <p>
                    {[tx.billing_city, tx.billing_state, tx.billing_zip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {tx.billing_country && <p>{tx.billing_country}</p>}
                {tx.customer_email && <p className="text-zinc-400 mt-1">{tx.customer_email}</p>}
                {tx.customer_ip && (
                  <p className="text-zinc-500 text-xs mt-1">IP: {tx.customer_ip}</p>
                )}
              </div>
            </div>
          )}

          {/* Event Timeline */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-5">
              Payment Timeline
            </h3>

            {events.length === 0 ? (
              <p className="text-sm text-zinc-500">No payment events recorded yet.</p>
            ) : (
              <ol className="relative border-l border-zinc-800 ml-2 space-y-5">
                {events.map((event) => {
                  const meta = getEventMeta(event.event_type);
                  const sub = getEventSubDetail(event);
                  return (
                    <li key={event.id} className="ml-5">
                      <span className="absolute -left-2 flex h-4 w-4 items-center justify-center">
                        {meta.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{meta.label}</p>
                        {sub && (
                          <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
                        )}
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Right column: Payment Details */}
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">
              Payment Details
            </h3>

            {!tx ? (
              <p className="text-sm text-zinc-500">No payment transaction recorded.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Payment ID</p>
                  <p className="font-mono text-xs text-zinc-300 break-all">{tx.id}</p>
                </div>
                {tx.payrilla_reference_number && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-0.5">PayRilla Reference #</p>
                    <p className="font-mono text-zinc-300">{tx.payrilla_reference_number}</p>
                  </div>
                )}
                {(tx.card_type || tx.card_last4) && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-0.5">Payment Method</p>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-300">
                        {tx.card_type ?? "Card"} •••• {tx.card_last4 ?? "????"}
                      </span>
                    </div>
                  </div>
                )}
                {tx.payrilla_auth_code && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-0.5">Auth Code</p>
                    <p className="font-mono text-zinc-300">{tx.payrilla_auth_code}</p>
                  </div>
                )}
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Status</p>
                  {getPaymentStatusBadge(tx.payrilla_status)}
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Risk Evaluation</p>
                  {getNoFraudBadge(tx.nofraud_decision)}
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Created</p>
                  <p className="text-zinc-400 text-xs">{formatDate(tx.created_at)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Updated</p>
                  <p className="text-zinc-400 text-xs">{formatDate(tx.updated_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Security indicator */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-400 space-y-1">
              <p className="font-medium text-zinc-300">Audit trail active</p>
              <p>All payment state changes are recorded immutably in the event timeline.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
