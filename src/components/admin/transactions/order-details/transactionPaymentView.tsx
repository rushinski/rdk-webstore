import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Clock, Info, XCircle } from "lucide-react";

export const fmtDate = (
  iso: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
) => {
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
};

export function getOrderStatusMeta(status: string | null | undefined) {
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

export function getAvsLabel(code: string | null | undefined) {
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

export function getCvvLabel(code: string | null | undefined) {
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

export function getNoFraudBadge(decision: string | null | undefined) {
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

export function getEventMeta(
  type: string,
  eventData?: Record<string, unknown>,
): { icon: ReactNode; label: string; description?: string } {
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
