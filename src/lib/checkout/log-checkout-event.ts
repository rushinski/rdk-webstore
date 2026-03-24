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
}

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
    });
  } catch {
    // Non-fatal — logging must never affect checkout
  }
}
