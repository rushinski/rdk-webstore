// src/lib/checkout/log-checkout-event.ts
//
// Fire-and-forget helper that writes a row to checkout_api_logs.
// Any failure is swallowed so logging never blocks the checkout flow.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CheckoutLogEntry {
  orderId?: string | null;
  tenantId?: string | null;
  requestId?: string | null;
  route: string;
  method?: string;
  httpStatus?: number;
  durationMs?: number;
  eventLabel?: string;
  errorMessage?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

const REDACTED_VALUE = "[redacted]";
const TRUNCATED_VALUE = "[truncated]";
const CIRCULAR_VALUE = "[circular]";
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;

const FULL_REDACT_KEY_PATTERN =
  /(authorization|api[_-]?key|auth[_-]?code|card[_-]?ref|cvv|cvv2|fingerprint|idempotency|nonce|password|secret|signature|source|token)/i;
const EMAIL_KEY_PATTERN = /email/i;
const PHONE_KEY_PATTERN = /phone/i;
const NAME_KEY_PATTERN = /(cardholder|name)/i;
const ADDRESS_KEY_PATTERN = /(address|street|line1|line2)/i;
const POSTAL_KEY_PATTERN = /(postal|zip)/i;
const IP_KEY_PATTERN = /ip/i;

const truncateString = (value: string) =>
  value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;

const maskEmail = (value: string) => {
  const [localPart = "", domainPart = ""] = value.split("@");
  if (!domainPart) {
    return REDACTED_VALUE;
  }
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(0, localPart.length - visible.length))}@${domainPart}`;
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return REDACTED_VALUE;
  }
  const last4 = digits.slice(-4);
  return `${"*".repeat(Math.max(0, digits.length - last4.length))}${last4}`;
};

const maskWords = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1)}${word.length > 1 ? "***" : ""}`)
    .join(" ");

const maskAddress = (value: string) => {
  if (value.length <= 4) {
    return REDACTED_VALUE;
  }
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

const maskPostalCode = (value: string) => {
  if (value.length <= 2) {
    return REDACTED_VALUE;
  }
  return `${value.slice(0, 2)}***`;
};

const maskIpAddress = (value: string) => {
  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
    }
  }
  return `${value.slice(0, 4)}***`;
};

function sanitizePayloadValue(
  key: string,
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (FULL_REDACT_KEY_PATTERN.test(key)) {
    return REDACTED_VALUE;
  }

  if (typeof value === "string") {
    if (EMAIL_KEY_PATTERN.test(key)) {
      return maskEmail(value);
    }
    if (PHONE_KEY_PATTERN.test(key)) {
      return maskPhone(value);
    }
    if (IP_KEY_PATTERN.test(key)) {
      return maskIpAddress(value);
    }
    if (POSTAL_KEY_PATTERN.test(key)) {
      return maskPostalCode(value);
    }
    if (ADDRESS_KEY_PATTERN.test(key)) {
      return maskAddress(value);
    }
    if (NAME_KEY_PATTERN.test(key)) {
      return maskWords(value);
    }
    return truncateString(value);
  }

  if (typeof value !== "object") {
    return truncateString(String(value));
  }

  if (depth >= MAX_DEPTH) {
    return TRUNCATED_VALUE;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizePayloadValue(key, item, depth + 1, seen));
  }

  if (seen.has(value)) {
    return CIRCULAR_VALUE;
  }

  seen.add(value);

  const next: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    next[childKey] = sanitizePayloadValue(childKey, childValue, depth + 1, seen);
  }
  return next;
}

const sanitizePayload = (payload: unknown) => {
  if (payload === null) {
    return null;
  }
  return sanitizePayloadValue("", payload, 0, new WeakSet<object>());
};

export async function logCheckoutEvent(
  supabase: SupabaseClient,
  entry: CheckoutLogEntry,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("checkout_api_logs").insert({
      order_id: entry.orderId ?? null,
      tenant_id: entry.tenantId ?? null,
      request_id: entry.requestId ?? null,
      route: entry.route,
      method: entry.method ?? "POST",
      http_status: entry.httpStatus ?? null,
      duration_ms: entry.durationMs ?? null,
      event_label: entry.eventLabel ?? null,
      error_message: entry.errorMessage ?? null,
      request_payload: sanitizePayload(entry.requestPayload),
      response_payload: sanitizePayload(entry.responsePayload),
    });
  } catch {
    // Non-fatal - logging must never affect checkout
  }
}
