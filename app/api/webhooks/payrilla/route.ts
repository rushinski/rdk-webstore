// app/api/webhooks/payrilla/route.ts
//
// PayRilla webhook handler.
//
// ⚠️  PARTIAL IMPLEMENTATION — AWAITING PAYRILLA DOCS
// Webhook signature verification and event type names are TBD until
// PayRilla API documentation is confirmed.
//
// CSRF EXEMPTION: Add `/api/webhooks/payrilla` to the CSRF exemption list
// in src/lib/middleware/csrf.ts.
//
// WEBHOOK SETUP (once PayRilla docs are reviewed):
//   - Register this endpoint URL with PayRilla dashboard
//   - Set PAYRILLA_WEBHOOK_SECRET env var to the webhook signing secret
//   - Subscribe to: transaction.approved, transaction.failed,
//                   transaction.voided, refund.completed

import crypto from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { PaymentWebhookEventsRepository } from "@/repositories/payment-webhook-events-repo";
import { PaymentTransactionsRepository } from "@/repositories/payment-transactions-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { NexusRepository } from "@/repositories/nexus-repo";
import { ProductService } from "@/services/product-service";
import { ChatService } from "@/services/chat-service";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { EvidenceService } from "@/services/evidence-service";
import { sendOrderCompletionEmailsIfNeeded } from "@/services/order-completion-email-service";
import { RefundNotificationService } from "@/services/refund-notification-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";
import type { Tables, TablesUpdate } from "@/types/db/database.types";

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;

const RECENT_REFUND_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

// ---------- PayRilla webhook payload shapes (from WEBHOOKS.md) ----------
//
// Event envelope: { event, type, subType, id, timestamp, data }
//   event: "transaction" | "batch"
//   type:  "succeeded" | "declined" | "updated" | "error" | "status"
//   subType: "charge" | "refund" | "void" | "credit" | "adjust"
//   id: string — unique event ID for deduplication
//   data: CreditCardResponse (see API_SPEC.md)
//
// data.reference_number → integer transaction ID (stored as payment_transaction_id)
// data.transaction.transaction_details.order_number → our orderId (passed at charge time)
// data.transaction.transaction_details.custom1 → our tenantId (passed at charge time)

type PayrillaWebhookEvent = {
  id: string;
  event: "transaction" | "batch";
  type: "succeeded" | "declined" | "updated" | "error" | "status" | string;
  subType?: "charge" | "refund" | "void" | "credit" | "adjust" | string;
  timestamp: string;
  account?: string;
  data: PayrillaTransactionData;
};

type PayrillaTransactionData = {
  // BaseChargeResponse fields
  reference_number?: number | null;
  status?: "Approved" | "Partially Approved" | "Declined" | "Error";
  status_code?: "A" | "P" | "D" | "E";
  auth_amount?: number;
  auth_code?: string;
  avs_result_code?: string | null;
  cvv2_result_code?: string | null;
  card_type?: string | null;
  last_4?: string | null;
  card_ref?: string | null;
  error_message?: string;
  // CardTransaction nested object
  transaction?: {
    id?: number;
    transaction_details?: {
      order_number?: string; // our orderId
      description?: string;
    };
    custom_fields?: {
      custom1?: string; // our tenantId
      custom2?: string; // our orderId (redundant backup)
    };
    amount_details?: {
      amount?: number;
    };
  };
};

// ---------- Signature verification ----------
//
// PayRilla sends an X-Signature header containing HMAC-SHA256 of the raw request
// body, keyed with the webhook endpoint's secret (set in Control Panel).
// See WEBHOOKS.md: "Verifying event data"

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!env.PAYRILLA_WEBHOOK) {
    log({ level: "warn", layer: "payrilla", message: "webhook_no_secret_configured" });
    return false;
  }
  if (!signature) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", env.PAYRILLA_WEBHOOK)
    .update(body)
    .digest("hex");
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Extract orderId from PayRilla transaction data.
// Primary: transaction_details.order_number (set by us at charge time)
// Fallback: custom_fields.custom2 (also set by us)
function getOrderIdFromData(data: PayrillaTransactionData): string | undefined {
  return (
    data.transaction?.transaction_details?.order_number ||
    data.transaction?.custom_fields?.custom2 ||
    undefined
  );
}

// Extract tenantId from custom_fields.custom1 (set by us at charge time)
function getTenantIdFromData(data: PayrillaTransactionData): string | undefined {
  return data.transaction?.custom_fields?.custom1 || undefined;
}

// ---------- Route handler ----------

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.text();
    // PayRilla signs webhooks with X-Signature header (HMAC-SHA256 of body)
    const signature = request.headers.get("x-signature") ?? null;

    if (!verifyWebhookSignature(body, signature)) {
      log({
        level: "error",
        layer: "payrilla",
        message: "webhook_signature_validation_failed",
        requestId,
        hasSignature: Boolean(signature),
      });
      return json({ error: "Invalid signature", requestId }, 400);
    }

    let event: PayrillaWebhookEvent;
    try {
      event = JSON.parse(body) as PayrillaWebhookEvent;
    } catch {
      return json({ error: "Invalid JSON payload", requestId }, 400);
    }

    if (!event.id || !event.type) {
      return json({ error: "Missing event id or type", requestId }, 400);
    }

    log({
      level: "info",
      layer: "api",
      message: "payrilla_webhook_received",
      requestId,
      eventType: event.type,
      eventId: event.id,
      merchantAccount: event.account,
    });

    const adminSupabase = createSupabaseAdminClient();
    const eventsRepo = new PaymentWebhookEventsRepository(adminSupabase);

    // Deduplicate
    const alreadyProcessed = await eventsRepo.hasProcessed(event.id);
    if (alreadyProcessed) {
      return json({ received: true }, 200);
    }

    // Route by event + type + subType
    // PayRilla schema: { event: "transaction", type: "succeeded"|"declined"|..., subType: "charge"|"refund"|"void"|... }
    const routeKey = `${event.event}:${event.type}:${event.subType ?? ""}`;

    if (
      event.event === "transaction" &&
      event.type === "succeeded" &&
      event.subType === "charge"
    ) {
      await handleTransactionApproved(event, adminSupabase, requestId);
    } else if (event.event === "transaction" && event.type === "declined") {
      await handleTransactionFailed(event, adminSupabase, requestId);
    } else if (event.event === "transaction" && event.type === "error") {
      await handleTransactionFailed(event, adminSupabase, requestId);
    } else if (
      event.event === "transaction" &&
      event.type === "updated" &&
      event.subType === "void"
    ) {
      await handleTransactionVoided(event, adminSupabase, requestId);
    } else if (
      event.event === "transaction" &&
      event.type === "succeeded" &&
      event.subType === "refund"
    ) {
      await handleRefundCompleted(event, adminSupabase, requestId);
    } else {
      log({
        level: "info",
        layer: "payrilla",
        message: "webhook_unhandled_event",
        requestId,
        routeKey,
      });
    }

    // Record as processed
    const orderId = getOrderIdFromData(event.data);
    await eventsRepo.recordProcessed(
      event.id,
      routeKey,
      Date.now(),
      event.data as Record<string, unknown>,
      orderId,
    );

    return json({ received: true }, 200);
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/webhooks/payrilla" });
    // Return 200 to prevent PayRilla retries on unrecoverable errors
    return json({ error: "Internal error", requestId }, 200);
  }
}

// ---------- transaction.approved ----------

async function handleTransactionApproved(
  event: PayrillaWebhookEvent,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const orderId = getOrderIdFromData(event.data);
  const tenantId = getTenantIdFromData(event.data);
  // reference_number is the PayRilla transaction ID (integer stored as string)
  const transactionId = event.data.reference_number?.toString() ?? "";

  if (!orderId) {
    log({ level: "warn", layer: "payrilla", message: "approved_no_order_id", requestId });
    return;
  }

  const ordersRepo = new OrdersRepository(adminSupabase);
  const order = await ordersRepo.getById(orderId);
  if (!order) {
    log({
      level: "error",
      layer: "payrilla",
      message: "approved_order_not_found",
      requestId,
      orderId,
    });
    return;
  }

  // Mark paid & decrement inventory
  const orderItems = await ordersRepo.getOrderItems(orderId);

  let didMarkPaid = false;
  try {
    if (order.status === "failed") {
      await ordersRepo.resetFailedOrderForRetry(
        orderId,
        new Date(Date.now() + 60 * 60 * 1000),
      );
    }

    didMarkPaid = await ordersRepo.markPaidTransactionally(
      orderId,
      transactionId,
      orderItems.map((i) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      })),
    );
  } catch (rpcError) {
    logError(rpcError, {
      layer: "payrilla",
      message: "mark_paid_rpc_threw",
      requestId,
      orderId,
    });
  }

  // Fallback: direct update if RPC failed
  if (!didMarkPaid) {
    const { data: fallbackRow, error: fallbackError } = await adminSupabase
      .from("orders")
      .update({
        status: "paid",
        payment_transaction_id: transactionId,
        failure_reason: null,
      })
      .eq("id", orderId)
      .in("status", ["pending", "processing", "failed"])
      .select("id")
      .maybeSingle();

    if (fallbackError) {
      log({
        level: "error",
        layer: "payrilla",
        message: "fallback_update_failed",
        requestId,
        orderId,
        error: fallbackError.message,
      });
    } else if (fallbackRow) {
      didMarkPaid = true;
    }
  }

  if (didMarkPaid) {
    // Sync product size tags
    const productService = new ProductService(adminSupabase);
    const productIds = [...new Set(orderItems.map((i) => i.product_id))];
    for (const pid of productIds) {
      await productService.syncSizeTags(pid);
    }

    // Record nexus sale
    const currentOrder = await ordersRepo.getById(orderId);
    const postPaymentOrder = currentOrder ?? order;

    if (postPaymentOrder.customer_state && postPaymentOrder.tenant_id) {
      try {
        const nexusRepo = new NexusRepository(adminSupabase);
        await nexusRepo.recordSale({
          tenantId: postPaymentOrder.tenant_id,
          stateCode: postPaymentOrder.customer_state,
          orderTotal: Number(postPaymentOrder.total ?? 0),
          taxAmount: Number(postPaymentOrder.tax_amount ?? 0),
          isTaxable: Number(postPaymentOrder.tax_amount ?? 0) > 0,
        });
      } catch (err) {
        log({
          level: "warn",
          layer: "payrilla",
          message: "nexus_tracking_failed",
          requestId,
          orderId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Collect chargeback evidence
    const resolvedTenantId = tenantId ?? order.tenant_id ?? null;
    if (resolvedTenantId) {
      try {
        const evidenceService = new EvidenceService(adminSupabase);
        await evidenceService.collectPaymentEvidence({
          orderId,
          tenantId: resolvedTenantId,
          paymentTransactionId: transactionId,
          // auth_amount is in USD — convert to dollars (already is)
          paymentAmount: event.data.auth_amount ?? 0,
          paymentCurrency: "USD",
          paymentMethodLast4: event.data.last_4,
          paymentMethodType: event.data.card_type,
          avsResultCode: event.data.avs_result_code,
          cvvResultCode: event.data.cvv2_result_code,
        });
      } catch {
        /* non-fatal */
      }
    }
  }

  // Paid event (idempotent)
  const orderEventsRepo = new OrderEventsRepository(adminSupabase);
  const hasPaidEvent = await orderEventsRepo.hasEvent(orderId, "paid");
  if (!hasPaidEvent) {
    await orderEventsRepo.insertEvent({
      orderId,
      type: "paid",
      message: "Payment confirmed via PayRilla.",
    });
  }

  // Handle fulfillment type
  const currentOrder = await ordersRepo.getById(orderId);
  const postPaymentOrder = currentOrder ?? order;
  const fulfillment = postPaymentOrder.fulfillment === "pickup" ? "pickup" : "ship";

  // Shipping snapshot from PayRilla transaction metadata (if provided)
  if (fulfillment === "ship") {
    const addressesRepo = new AddressesRepository(adminSupabase);
    const existing = await addressesRepo.getOrderShipping(orderId);
    if (!existing) {
      await ordersRepo.setFulfillmentStatus(orderId, "unfulfilled");
    }
  }

  // Pickup chat
  if (fulfillment === "pickup" && postPaymentOrder.user_id) {
    try {
      const chatService = new ChatService(adminSupabase, adminSupabase);
      await chatService.createChatForUser({ userId: postPaymentOrder.user_id, orderId });
    } catch {
      /* non-fatal */
    }
  }

  // Admin notification
  try {
    const notifications = new AdminNotificationService(adminSupabase);
    await notifications.notifyOrderPlaced(orderId);
  } catch {
    /* non-fatal */
  }

  // Emails
  await sendWebhookEmails(
    postPaymentOrder,
    orderId,
    orderItems,
    fulfillment,
    adminSupabase,
    requestId,
  );

  // Cache revalidation
  try {
    const { revalidateTag } = await import("next/cache");
    for (const item of orderItems) {
      revalidateTag(`product:${item.product_id}`, "max");
    }
    revalidateTag("products:list", "max");
  } catch {
    /* non-fatal */
  }

  log({
    level: "info",
    layer: "payrilla",
    message: "order_completed_via_webhook",
    requestId,
    orderId,
  });
}

// ---------- transaction.failed ----------

async function handleTransactionFailed(
  event: PayrillaWebhookEvent,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const orderId = getOrderIdFromData(event.data);
  if (!orderId) {
    return;
  }

  const failureMessage =
    event.type === "error"
      ? "Payment error via PayRilla"
      : "Payment declined by PayRilla";

  const { error } = await adminSupabase
    .from("orders")
    .update({ status: "failed" })
    .eq("id", orderId)
    .in("status", ["pending", "processing"]);

  if (error) {
    log({
      level: "error",
      layer: "payrilla",
      message: "order_status_failed_update_error",
      requestId,
      orderId,
      error: error.message,
    });
    return;
  }

  const orderEventsRepo = new OrderEventsRepository(adminSupabase);
  await orderEventsRepo.insertEvent({
    orderId,
    type: "payment_failed",
    message: failureMessage,
  });

  log({
    level: "warn",
    layer: "payrilla",
    message: "transaction_failed",
    requestId,
    orderId,
  });
}

// ---------- transaction.voided ----------

async function handleTransactionVoided(
  event: PayrillaWebhookEvent,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const orderId = getOrderIdFromData(event.data);
  if (!orderId) {
    return;
  }

  await adminSupabase
    .from("orders")
    .update({ status: "canceled" })
    .eq("id", orderId)
    .in("status", ["pending", "processing"]);

  log({
    level: "info",
    layer: "payrilla",
    message: "transaction_voided",
    requestId,
    orderId,
  });
}

// ---------- refund.completed ----------

async function handleRefundCompleted(
  event: PayrillaWebhookEvent,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const orderId = getOrderIdFromData(event.data);
  if (!orderId) {
    return;
  }

  const refundAmountCents =
    event.data.auth_amount !== null && event.data.auth_amount !== undefined
      ? Math.round(event.data.auth_amount * 100)
      : null;
  if (refundAmountCents === null || refundAmountCents <= 0) {
    log({
      level: "warn",
      layer: "payrilla",
      message: "refund_completed_missing_amount",
      requestId,
      orderId,
      referenceNumber: event.data.reference_number,
    });
    return;
  }

  const ordersRepo = new OrdersRepository(adminSupabase);
  const order = await ordersRepo.getById(orderId);
  if (!order) {
    log({
      level: "warn",
      layer: "payrilla",
      message: "refund_completed_order_not_found",
      requestId,
      orderId,
    });
    return;
  }

  const orderTotalCents = Math.max(0, Math.round(Number(order.total ?? 0) * 100));
  const existingRefundCents = Math.max(0, Math.round(Number(order.refund_amount ?? 0)));
  const alreadyAppliedByAdmin = await hasRecentAdminRefundEvent({
    adminSupabase,
    orderId,
    refundAmountCents,
    currentRefundAmountCents: existingRefundCents,
  });

  let nextRefundAmountCents = existingRefundCents;
  let nextStatus: TablesUpdate<"orders">["status"] = order.status ?? "partially_refunded";

  if (!alreadyAppliedByAdmin) {
    nextRefundAmountCents = Math.min(
      orderTotalCents,
      existingRefundCents + refundAmountCents,
    );
    nextStatus =
      nextRefundAmountCents >= orderTotalCents ? "refunded" : "partially_refunded";

    await ordersRepo.updateRefundSummary(orderId, {
      status: nextStatus,
      refundAmount: nextRefundAmountCents,
      refundedAt: new Date().toISOString(),
    });

    const paymentTxRepo = new PaymentTransactionsRepository(adminSupabase);
    try {
      const paymentTx = await paymentTxRepo.getByOrderId(orderId);
      const paymentTxId =
        paymentTx !== null && typeof paymentTx.id === "string" ? paymentTx.id : null;

      if (paymentTxId) {
        await paymentTxRepo.update(paymentTxId, {
          amountRefunded: nextRefundAmountCents / 100,
        });
        await paymentTxRepo.logEvent({
          paymentTransactionId: paymentTxId,
          orderId,
          tenantId: order.tenant_id ?? null,
          eventType:
            nextRefundAmountCents >= orderTotalCents
              ? "payment_refunded"
              : "payment_refund_partial",
          eventData: {
            refundType: "webhook",
            refundedCents: refundAmountCents,
            nextRefundAmountCents,
            referenceNumber: event.data.reference_number,
          },
        });
      }
    } catch (paymentEventError) {
      logError(paymentEventError, {
        layer: "payrilla",
        message: "refund_completed_payment_log_failed",
        requestId,
        orderId,
      });
    }

    const orderEventsRepo = new OrderEventsRepository(adminSupabase);
    await orderEventsRepo.insertEvent({
      orderId,
      type: "refunded",
      message: "Refund completed via PayRilla.",
    });
  }

  try {
    const refundNotifications = new RefundNotificationService(adminSupabase);
    await refundNotifications.sendRefundNotification({
      order: {
        ...order,
        refund_amount: nextRefundAmountCents,
        refunded_at: new Date().toISOString(),
        status: nextStatus,
      },
      refundAmountCents,
      cumulativeRefundCents: nextRefundAmountCents,
      requestId,
      skipIfAlreadySent: true,
    });
  } catch (emailError) {
    logError(emailError, {
      layer: "payrilla",
      message: "refund_notification_failed",
      requestId,
      orderId,
    });
  }

  log({
    level: "info",
    layer: "payrilla",
    message: "refund_completed",
    requestId,
    orderId,
    referenceNumber: event.data.reference_number,
    amountUsd: event.data.auth_amount,
    alreadyAppliedByAdmin,
    cumulativeRefundCents: nextRefundAmountCents,
  });
}

async function hasRecentAdminRefundEvent(params: {
  adminSupabase: AdminSupabaseClient;
  orderId: string;
  refundAmountCents: number;
  currentRefundAmountCents: number;
}) {
  const cutoff = new Date(Date.now() - RECENT_REFUND_DEDUPE_WINDOW_MS).toISOString();
  const { data, error } = await params.adminSupabase
    .from("payment_events")
    .select("event_data, created_at")
    .eq("order_id", params.orderId)
    .in("event_type", ["payment_refunded", "payment_refund_partial"])
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).some((event) => {
    const eventData =
      event.event_data && typeof event.event_data === "object"
        ? (event.event_data as Record<string, unknown>)
        : null;

    return (
      Number(eventData?.refundedCents ?? NaN) === params.refundAmountCents &&
      Number(eventData?.nextRefundAmountCents ?? NaN) === params.currentRefundAmountCents
    );
  });
}

// ---------- Email helper ----------

async function sendWebhookEmails(
  order: OrderRow,
  orderId: string,
  orderItems: OrderItemRow[],
  fulfillment: "ship" | "pickup",
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  await sendOrderCompletionEmailsIfNeeded({
    order,
    orderId,
    orderItems,
    fulfillment,
    adminSupabase,
    requestId,
    logLayer: "payrilla",
  });
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
