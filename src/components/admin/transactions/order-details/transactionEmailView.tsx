import { CheckCircle, Info, Mail, Package, Truck } from "lucide-react";

import type { CheckoutLog, PaymentEvent } from "./types";

export function getEmailTypeMeta(type: string) {
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

export function getRelatedCheckoutLogs(event: PaymentEvent, logs: CheckoutLog[]) {
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
