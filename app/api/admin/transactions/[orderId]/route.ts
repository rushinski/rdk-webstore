// app/api/admin/transactions/[orderId]/route.ts
// Returns a complete transaction detail payload for the admin transaction detail page.
// Aggregates: order + items + payment_transaction + payment_events + email_audit_log + shipping

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { orderId } = await params;

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();

    // --- Order + items + shipping ---
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        *,
        profiles!user_id(email, full_name),
        items:order_items(
          id, quantity, unit_price, unit_cost, line_total, refund_amount, refunded_at,
          product:products(
            id, name, brand, model, title_display, title_raw, category,
            sku, cost_cents, description, created_at,
            images:product_images(url, is_primary, sort_order),
            tags:product_tags(tag:tags(label, group_key))
          ),
          variant:product_variants(id, size_label, price_cents, cost_cents)
        ),
        shipping:order_shipping(*)
        `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    // --- Payment transaction ---
    const { data: paymentTxRows } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1);
    const paymentTx = paymentTxRows?.[0] ?? null;

    // --- Payment events (checkout activity timeline) ---
    const { data: paymentEvents } = await admin
      .from("payment_events")
      .select("id, event_type, event_data, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    // --- Email audit log ---
    const { data: emailLogs } = await supabase
      .from("email_audit_log")
      .select(
        "id, email_type, recipient_email, subject, sent_at, delivered_at, opened_at, delivery_status, message_id, html_snapshot, plain_text_snapshot",
      )
      .eq("order_id", orderId)
      .order("sent_at", { ascending: true });

    // --- Shipping tracking events ---
    const { data: trackingEvents } = await admin
      .from("shipping_tracking_events")
      .select("id, status, description, location, event_timestamp, carrier, tracking_number")
      .eq("order_id", orderId)
      .order("event_timestamp", { ascending: true });

    // --- Checkout API logs ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: checkoutLogs } = await (admin as any)
      .from("checkout_api_logs")
      .select("id, route, method, http_status, duration_ms, event_label, error_message, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    return NextResponse.json(
      {
        order,
        paymentTransaction: paymentTx,
        paymentEvents: paymentEvents ?? [],
        emailLogs: emailLogs ?? [],
        trackingEvents: trackingEvents ?? [],
        checkoutLogs: checkoutLogs ?? [],
        requestId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: `/api/admin/transactions/${orderId}`,
    });
    return NextResponse.json(
      { error: "Failed to fetch transaction", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
