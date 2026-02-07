// src/app/api/webhooks/stripe/route.ts
//
// KEY CHANGES:
// 1. Handles CONNECT ACCOUNT events (direct charges fire events on the
//    Connect account which are forwarded to the platform via Connect webhooks).
//    The `event.account` field tells us which Connect account fired it.
// 2. Properly handles async payment methods (Afterpay, Affirm, Klarna, CashApp):
//    - payment_intent.processing → order.status = "processing"
//    - payment_intent.succeeded → mark paid, decrement stock, send emails
//    - payment_intent.payment_failed → mark failed
// 3. Uses a single unified order-completion flow (no duplication).
// 4. Tax transaction creation via Connect account.
//
// WEBHOOK SETUP:
// In Stripe Dashboard → Developers → Webhooks, create an endpoint that
// listens to events from "Connected accounts" with these events:
//   - payment_intent.succeeded
//   - payment_intent.processing
//   - payment_intent.payment_failed
//   - charge.refunded
//   - charge.refund.updated

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { StripeEventsRepository } from "@/repositories/stripe-events-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { NexusRepository } from "@/repositories/nexus-repo";
import { ProductService } from "@/services/product-service";
import { OrderEmailService } from "@/services/order-email-service";
import { AdminOrderEmailService } from "@/services/admin-order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { ChatService } from "@/services/chat-service";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";
import type { Tables, TablesUpdate } from "@/types/db/database.types";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type ProductSummary = Pick<Tables<"products">, "title_display" | "brand" | "name">;
type VariantSummary = Pick<Tables<"product_variants">, "size_label">;
type DetailedOrderItem = OrderItemRow & {
  product: ProductSummary | null;
  variant: VariantSummary | null;
};
type MetadataCarrier = { metadata?: Stripe.Metadata };

function getOrderIdFromMetadata(payload: Stripe.Event.Data.Object): string | undefined {
  if (typeof payload === "object" && payload !== null && "metadata" in payload) {
    const metadata = (payload as MetadataCarrier).metadata;
    if (metadata && typeof metadata.order_id === "string") {
      return metadata.order_id;
    }
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return json({ error: "Missing signature", requestId }, 400);
    }

    let event: Stripe.Event;
    try {
      // Use the Connect webhook secret for events from connected accounts
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return json({ error: "Invalid signature", requestId }, 400);
    }

    // `event.account` is the Connect account ID when using Connect webhooks
    const connectAccountId = event.account ?? null;

    log({
      level: "info",
      layer: "api",
      message: "stripe_webhook_received",
      requestId,
      eventType: event.type,
      eventId: event.id,
      connectAccountId,
    });

    const adminSupabase = createSupabaseAdminClient();
    const eventsRepo = new StripeEventsRepository(adminSupabase);

    // Deduplicate
    const alreadyProcessed = await eventsRepo.hasProcessed(event.id);
    if (alreadyProcessed) {
      return json({ received: true }, 200);
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event,
          connectAccountId,
          adminSupabase,
          requestId,
        );
        break;

      case "payment_intent.processing":
        await handlePaymentIntentProcessing(event, adminSupabase, requestId);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event, adminSupabase, requestId);
        break;

      case "charge.refunded":
      case "charge.refund.updated":
      case "refund.created":
      case "refund.updated":
        await handleRefundEvent(event, adminSupabase, requestId);
        break;

      default:
        log({
          level: "info",
          layer: "stripe",
          message: "webhook_unhandled_event",
          requestId,
          eventType: event.type,
        });
    }

    // Record as processed
    await eventsRepo.recordProcessed(
      event.id,
      event.type,
      event.created,
      event.data.object,
      getOrderIdFromMetadata(event.data.object),
    );

    return json({ received: true }, 200);
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/webhooks/stripe" });
    // Return 200 to prevent Stripe retries on unrecoverable errors
    return json({ error: "Internal error", requestId }, 200);
  }
}

// ---------- payment_intent.succeeded ----------
// This is the PRIMARY handler for marking orders paid.
// For card payments, confirm-payment may have already handled this.
// For BNPL (Afterpay, Affirm, Klarna), THIS is where the order
// transitions from "processing" → "paid".

async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  connectAccountId: string | null,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const pi = event.data.object as Stripe.PaymentIntent;
  const orderId = pi.metadata?.order_id;
  const tenantId = pi.metadata?.tenant_id;

  if (!orderId) {
    log({
      level: "warn",
      layer: "stripe",
      message: "pi_succeeded_no_order_id",
      requestId,
      piId: pi.id,
    });
    return;
  }

  const ordersRepo = new OrdersRepository(adminSupabase);
  const order = await ordersRepo.getById(orderId);
  if (!order) {
    log({
      level: "error",
      layer: "stripe",
      message: "pi_succeeded_order_not_found",
      requestId,
      orderId,
    });
    return;
  }

  // Mark paid & decrement inventory (idempotent)
  const orderItems = await ordersRepo.getOrderItems(orderId);
  const didMarkPaid = await ordersRepo.markPaidTransactionally(
    orderId,
    pi.id,
    orderItems.map((i) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      quantity: i.quantity,
    })),
  );

  if (didMarkPaid) {
    log({
      level: "info",
      layer: "stripe",
      message: "order_marked_paid_via_webhook",
      requestId,
      orderId,
    });

    // Sync product size tags
    const productService = new ProductService(adminSupabase);
    const productIds = [...new Set(orderItems.map((i) => i.product_id))];
    for (const pid of productIds) {
      await productService.syncSizeTags(pid);
    }

    // Record nexus sale
    if (order.customer_state && order.tenant_id) {
      try {
        const nexusRepo = new NexusRepository(adminSupabase);
        await nexusRepo.recordSale({
          tenantId: order.tenant_id,
          stateCode: order.customer_state,
          orderTotal: Number(order.total ?? 0),
          taxAmount: Number(order.tax_amount ?? 0),
          isTaxable: Number(order.tax_amount ?? 0) > 0,
        });
      } catch (err) {
        log({
          level: "warn",
          layer: "stripe",
          message: "nexus_tracking_failed",
          requestId,
          orderId,
          error: err instanceof Error ? err.message : String(err),
        });
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
      message: "Payment confirmed.",
    });
  }

  // Save shipping snapshot from PI
  const fulfillment = order.fulfillment === "pickup" ? "pickup" : "ship";
  if (fulfillment === "ship" && pi.shipping?.address) {
    const addressesRepo = new AddressesRepository(adminSupabase);
    const existing = await addressesRepo.getOrderShipping(orderId);
    if (!existing) {
      await addressesRepo.insertOrderShippingSnapshot(orderId, {
        name: pi.shipping.name ?? null,
        phone: pi.shipping.phone ?? null,
        line1: pi.shipping.address.line1 ?? null,
        line2: pi.shipping.address.line2 ?? null,
        city: pi.shipping.address.city ?? null,
        state: pi.shipping.address.state ?? null,
        postalCode: pi.shipping.address.postal_code ?? null,
        country: pi.shipping.address.country ?? null,
      });
      if (order.user_id) {
        await addressesRepo.upsertUserAddress(order.user_id, {
          name: pi.shipping.name ?? null,
          phone: pi.shipping.phone ?? null,
          line1: pi.shipping.address.line1 ?? null,
          line2: pi.shipping.address.line2 ?? null,
          city: pi.shipping.address.city ?? null,
          state: pi.shipping.address.state ?? null,
          postalCode: pi.shipping.address.postal_code ?? null,
          country: pi.shipping.address.country ?? null,
        });
      }
      await ordersRepo.setFulfillmentStatus(orderId, "unfulfilled");
    }
  }

  // Pickup chat
  if (fulfillment === "pickup" && order.user_id) {
    try {
      const chatService = new ChatService(adminSupabase, adminSupabase);
      await chatService.createChatForUser({ userId: order.user_id, orderId });
    } catch {
      /* non-fatal */
    }
  }

  // Tax transaction (on Connect account)
  const taxCalculationId = pi.metadata?.tax_calculation_id;
  const resolvedAccountId =
    connectAccountId ??
    (tenantId
      ? await new ProfileRepository(adminSupabase).getStripeAccountIdForTenant(tenantId)
      : null);

  if (taxCalculationId && taxCalculationId !== "" && resolvedAccountId) {
    try {
      const taxService = new StripeTaxService(adminSupabase, resolvedAccountId);
      const txnId = await taxService.createTaxTransaction({
        taxCalculationId,
        reference: orderId,
      });
      if (txnId) {
        await adminSupabase
          .from("orders")
          .update({ stripe_tax_transaction_id: txnId })
          .eq("id", orderId);
      }
    } catch (err) {
      logError(err, {
        layer: "stripe",
        message: "tax_transaction_failed",
        orderId,
        taxCalculationId,
      });
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
    order,
    orderId,
    orderItems,
    fulfillment,
    pi,
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
    layer: "stripe",
    message: "order_completed_via_webhook",
    requestId,
    orderId,
  });
}

// ---------- payment_intent.processing ----------
// BNPL methods enter this state when the customer has authorized
// but funds haven't settled yet. We mark the order as "processing".

async function handlePaymentIntentProcessing(
  event: Stripe.Event,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const pi = event.data.object as Stripe.PaymentIntent;
  const orderId = pi.metadata?.order_id;
  if (!orderId) {
    return;
  }

  await adminSupabase
    .from("orders")
    .update({ status: "processing" })
    .eq("id", orderId)
    .in("status", ["pending"]); // only transition pending → processing

  log({
    level: "info",
    layer: "stripe",
    message: "order_status_processing",
    requestId,
    orderId,
    paymentMethod: pi.payment_method_types?.[0],
  });
}

// ---------- payment_intent.payment_failed ----------
// Mark order as failed so it doesn't stay "pending" forever.

async function handlePaymentIntentFailed(
  event: Stripe.Event,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  const pi = event.data.object as Stripe.PaymentIntent;
  const orderId = pi.metadata?.order_id;
  if (!orderId) {
    return;
  }

  const failureMessage = pi.last_payment_error?.message ?? "Payment failed";

  await adminSupabase
    .from("orders")
    .update({ status: "failed" })
    .eq("id", orderId)
    .in("status", ["pending", "processing"]); // don't overwrite paid/refunded

  const orderEventsRepo = new OrderEventsRepository(adminSupabase);
  await orderEventsRepo.insertEvent({
    orderId,
    type: "payment_failed",
    message: failureMessage,
  });

  log({
    level: "warn",
    layer: "stripe",
    message: "payment_failed",
    requestId,
    orderId,
    failureMessage,
  });
}

// ---------- Refund events ----------

async function handleRefundEvent(
  event: Stripe.Event,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  try {
    const refund = event.data.object as Stripe.Refund;
    const chargeId =
      typeof refund.charge === "string" ? refund.charge : refund.charge?.id;

    if (!chargeId) {
      return;
    }

    const { data: orders } = await adminSupabase
      .from("orders")
      .select("id, status")
      .or(
        `stripe_charge_id.eq.${chargeId},stripe_payment_intent_id.eq.${refund.payment_intent}`,
      )
      .limit(1);

    if (!orders?.length) {
      return;
    }

    const order = orders[0];
    const updateData: TablesUpdate<"orders"> = {
      refund_amount: refund.amount,
      refunded_at: new Date(refund.created * 1000).toISOString(),
    };

    if (refund.status === "succeeded") {
      updateData.status = "refunded";
    } else if (refund.status === "pending") {
      updateData.status = "refund_pending";
    } else if (refund.status === "failed") {
      updateData.status = "refund_failed";
    }

    await adminSupabase.from("orders").update(updateData).eq("id", order.id);

    log({
      level: "info",
      layer: "stripe",
      message: "refund_processed",
      requestId,
      orderId: order.id,
      refundId: refund.id,
    });
  } catch (err) {
    logError(err, { layer: "stripe", requestId, message: "refund_handling_failed" });
  }
}

// ---------- Webhook email helper ----------

async function sendWebhookEmails(
  order: OrderRow,
  orderId: string,
  orderItems: OrderItemRow[],
  fulfillment: "ship" | "pickup",
  paymentIntent: Stripe.PaymentIntent,
  adminSupabase: AdminSupabaseClient,
  requestId: string,
) {
  try {
    const ordersRepo = new OrdersRepository(adminSupabase);
    const orderEventsRepo = new OrderEventsRepository(adminSupabase);
    const profilesRepo = new ProfileRepository(adminSupabase);
    const addressesRepo = new AddressesRepository(adminSupabase);
    const orderEmailService = new OrderEmailService();
    const orderAccessTokens = new OrderAccessTokenService(adminSupabase);

    let email = paymentIntent.receipt_email ?? null;
    if (!email && order.user_id) {
      const profile = await profilesRepo.getByUserId(order.user_id);
      email = profile?.email ?? null;
    }
    if (!email) {
      email = order.guest_email ?? null;
    }

    if (!email) {
      return;
    }

    if (!order.user_id && order.guest_email !== email) {
      await ordersRepo.updateGuestEmail(orderId, email);
    }

    let orderUrl: string | null = null;
    if (!order.user_id) {
      const { token } = await orderAccessTokens.createToken({ orderId });
      orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${orderId}?token=${encodeURIComponent(token)}`;
    }

    const detailedItems = (await ordersRepo.getOrderItemsDetailed(
      orderId,
    )) as DetailedOrderItem[];
    const items = detailedItems.map((item) => {
      const product = item.product;
      const title =
        product?.title_display ??
        (`${product?.brand ?? ""} ${product?.name ?? ""}`.trim() || "Item");
      return {
        title,
        sizeLabel: item.variant?.size_label ?? null,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      };
    });

    const shippingSnapshot =
      fulfillment === "ship" ? await addressesRepo.getOrderShipping(orderId) : null;

    const hasConfirmation = await orderEventsRepo.hasEvent(
      orderId,
      "confirmation_email_sent",
    );
    if (!hasConfirmation) {
      await orderEmailService.sendOrderConfirmation({
        to: email,
        orderId,
        createdAt: order.created_at ?? new Date().toISOString(),
        fulfillment,
        currency: order.currency ?? "USD",
        subtotal: Number(order.subtotal ?? 0),
        shipping: Number(order.shipping ?? 0),
        tax: Number(order.tax_amount ?? 0),
        total: Number(order.total ?? 0),
        items,
        orderUrl,
        shippingAddress: shippingSnapshot
          ? {
              name: shippingSnapshot.name,
              line1: shippingSnapshot.line1,
              line2: shippingSnapshot.line2,
              city: shippingSnapshot.city,
              state: shippingSnapshot.state,
              postalCode: shippingSnapshot.postal_code,
              country: shippingSnapshot.country,
            }
          : null,
      });
      await orderEventsRepo.insertEvent({
        orderId,
        type: "confirmation_email_sent",
        message: "Confirmation emailed.",
      });
    }

    if (fulfillment === "pickup") {
      const hasPickup = await orderEventsRepo.hasEvent(
        orderId,
        "pickup_instructions_sent",
      );
      if (!hasPickup) {
        await orderEmailService.sendPickupInstructions({ to: email, orderId, orderUrl });
        await orderEventsRepo.insertEvent({
          orderId,
          type: "pickup_instructions_sent",
          message: "Pickup instructions emailed.",
        });
      }
    }

    // Admin emails
    const hasAdminEmail = await orderEventsRepo.hasEvent(
      orderId,
      "admin_order_email_sent",
    );
    if (!hasAdminEmail) {
      const staff = await profilesRepo.listStaffProfiles();
      const recipients = staff.filter(
        (s) => s.admin_order_notifications_enabled !== false && s.email,
      );
      if (recipients.length > 0) {
        const adminEmailService = new AdminOrderEmailService();
        const itemCount = orderItems.reduce((sum, i) => sum + Number(i.quantity ?? 0), 0);
        await Promise.all(
          recipients.map((admin) =>
            adminEmailService.sendOrderPlaced({
              to: admin.email ?? "",
              orderId,
              fulfillment,
              subtotal: Number(order.subtotal ?? 0),
              shipping: Number(order.shipping ?? 0),
              tax: Number(order.tax_amount ?? 0),
              total: Number(order.total ?? 0),
              itemCount,
              customerEmail: email,
            }),
          ),
        );
        await orderEventsRepo.insertEvent({
          orderId,
          type: "admin_order_email_sent",
          message: "Admin notified.",
        });
      }
    }
  } catch (err) {
    log({
      level: "warn",
      layer: "stripe",
      message: "webhook_email_failed",
      requestId,
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
