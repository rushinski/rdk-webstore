// src/app/api/checkout/confirm-payment/route.ts
// FIXED: Creates access token BEFORE async email operations
// This ensures the processing page can poll order status immediately
// ALSO FIXED: Returns guestAccessToken in the response for processing status

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { NexusRepository } from "@/repositories/nexus-repo";
import { ProductService } from "@/services/product-service";
import { OrderEmailService } from "@/services/order-email-service";
import { AdminOrderEmailService } from "@/services/admin-order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { ChatService } from "@/services/chat-service";
import { StripeDirectChargeService } from "@/services/stripe-direct-charge-service";
import { confirmPaymentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";
import type { Tables } from "@/types/db/database.types";

const directCharge = new StripeDirectChargeService();

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type ProductSummary = Pick<Tables<"products">, "title_display" | "brand" | "name">;
type VariantSummary = Pick<Tables<"product_variants">, "size_label">;
type DetailedOrderItem = OrderItemRow & {
  product: ProductSummary | null;
  variant: VariantSummary | null;
};
type ErrorDetails = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

const PLACEHOLDER_EMAIL_DOMAIN = "@placeholder.local";

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPlaceholderEmail(value: string | null | undefined): boolean {
  return normalizeEmail(value)?.endsWith(PLACEHOLDER_EMAIL_DOMAIN) ?? false;
}

function extractErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return { message: error.message };
  }

  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const record = error as Record<string, unknown>;
  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.error === "string"
        ? record.error
        : String(error);
  const code = typeof record.code === "string" ? record.code : undefined;
  const details = typeof record.details === "string" ? record.details : undefined;
  const hint = typeof record.hint === "string" ? record.hint : undefined;

  return { message, code, details, hint };
}

async function resolvePaymentIntentEmail(params: {
  paymentIntent: Stripe.PaymentIntent;
  stripeAccountId: string;
  requestId: string;
  orderId: string;
}): Promise<{ email: string | null; source: string | null }> {
  const receiptEmail = normalizeEmail(params.paymentIntent.receipt_email);
  if (receiptEmail) {
    return { email: receiptEmail, source: "payment_intent.receipt_email" };
  }

  if (params.paymentIntent.latest_charge) {
    try {
      const chargeId =
        typeof params.paymentIntent.latest_charge === "string"
          ? params.paymentIntent.latest_charge
          : params.paymentIntent.latest_charge.id;

      const charge = await directCharge.retrieveCharge(params.stripeAccountId, chargeId);
      const chargeEmail = normalizeEmail(charge.billing_details?.email);
      if (chargeEmail) {
        return { email: chargeEmail, source: "charge.billing_details.email" };
      }
    } catch (error) {
      const details = extractErrorDetails(error);
      log({
        level: "warn",
        layer: "api",
        message: "charge_email_lookup_failed",
        requestId: params.requestId,
        orderId: params.orderId,
        error: details.message,
        code: details.code,
      });
    }
  }

  return { email: null, source: null };
}

async function ensureGuestContactForStatusTransitions(params: {
  order: OrderRow;
  orderId: string;
  requestId: string;
  stripeAccountId: string;
  guestEmail: string | null | undefined;
  paymentIntent: Stripe.PaymentIntent;
  ordersRepo: OrdersRepository;
}): Promise<string | null> {
  const {
    order,
    orderId,
    requestId,
    stripeAccountId,
    guestEmail,
    paymentIntent,
    ordersRepo,
  } = params;

  if (order.user_id) {
    return normalizeEmail(order.guest_email);
  }

  const existing = normalizeEmail(order.guest_email);
  if (existing) {
    return existing;
  }

  const requestedEmail = normalizeEmail(guestEmail);
  if (requestedEmail) {
    await ordersRepo.updateGuestEmail(orderId, requestedEmail);
    order.guest_email = requestedEmail;
    log({
      level: "info",
      layer: "api",
      message: "guest_contact_backfilled_for_confirm",
      requestId,
      orderId,
      emailSource: "frontend",
      isPlaceholder: false,
    });
    return requestedEmail;
  }

  const resolved = await resolvePaymentIntentEmail({
    paymentIntent,
    stripeAccountId,
    requestId,
    orderId,
  });
  const email = resolved.email ?? `guest-${orderId}${PLACEHOLDER_EMAIL_DOMAIN}`;
  const source = resolved.source ?? "placeholder";

  if (!resolved.email) {
    log({
      level: "warn",
      layer: "api",
      message: "guest_contact_missing_using_placeholder",
      requestId,
      orderId,
    });
  }

  await ordersRepo.updateGuestEmail(orderId, email);
  order.guest_email = email;
  log({
    level: "info",
    layer: "api",
    message: "guest_contact_backfilled_for_confirm",
    requestId,
    orderId,
    emailSource: source,
    isPlaceholder: source === "placeholder",
  });
  return email;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const adminSupabase = createSupabaseAdminClient();

    const body = await request.json().catch(() => null);
    const parsed = confirmPaymentSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        400,
      );
    }

    const { orderId, paymentIntentId, fulfillment, shippingAddress, guestEmail } =
      parsed.data;

    const ordersRepo = new OrdersRepository(adminSupabase);
    const order = await ordersRepo.getById(orderId);
    if (!order) {
      return json({ error: "Order not found", requestId }, 404);
    }

    // Auth
    if (!userId && order.user_id) {
      return json({ error: "Unauthorized", requestId }, 403);
    }
    if (userId && order.user_id && order.user_id !== userId) {
      return json({ error: "Unauthorized", requestId }, 403);
    }

    // Get tenant's Stripe account
    if (!order.tenant_id) {
      return json({ error: "Order missing tenant", requestId }, 500);
    }
    const profilesRepo = new ProfileRepository(adminSupabase);
    const stripeAccountId = await profilesRepo.getStripeAccountIdForTenant(
      order.tenant_id,
    );
    if (!stripeAccountId) {
      return json({ error: "Seller payment account not configured", requestId }, 400);
    }

    // Retrieve PaymentIntent from Connect account (direct charge)
    const paymentIntent = await directCharge.retrievePaymentIntent(
      stripeAccountId,
      paymentIntentId,
    );

    // Validate PI matches order
    if (paymentIntent.metadata?.order_id && paymentIntent.metadata.order_id !== orderId) {
      return json(
        {
          error: "Payment intent does not match order",
          code: "PAYMENT_INTENT_MISMATCH",
          requestId,
        },
        409,
      );
    }
    if (
      order.stripe_payment_intent_id &&
      order.stripe_payment_intent_id !== paymentIntentId
    ) {
      return json(
        {
          error: "Payment intent conflict",
          code: "PAYMENT_INTENT_CONFLICT",
          requestId,
        },
        409,
      );
    }

    // Link PI if not already
    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(orderId, paymentIntentId);
    }

    const orderEventsRepo = new OrderEventsRepository(adminSupabase);

    let guestAccessToken: string | null = null;
    if (!order.user_id) {
      const tokenService = new OrderAccessTokenService(adminSupabase);
      const { token } = await tokenService.createToken({ orderId });
      guestAccessToken = token;

      log({
        level: "info",
        layer: "api",
        message: "guest_access_token_created",
        requestId,
        orderId,
      });
    }

    // ---------- Handle payment status ----------

    // CRITICAL: BNPL methods (Afterpay, Affirm, Klarna) are "processing" initially.
    // This is NORMAL and EXPECTED. The payment will settle asynchronously and
    // the webhook will handle the final transition to "succeeded".
    // DO NOT treat "processing" as an error!
    if (paymentIntent.status === "processing") {
      await ensureGuestContactForStatusTransitions({
        order,
        orderId,
        requestId,
        stripeAccountId,
        guestEmail: guestEmail ?? null,
        paymentIntent,
        ordersRepo,
      });

      // Mark order as "processing" so it's tracked but not yet counted as revenue
      const { data: processingRow, error: processingError } = await adminSupabase
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle(); // only if still pending

      if (processingError) {
        throw processingError;
      }
      if (!processingRow) {
        log({
          level: "info",
          layer: "api",
          message: "payment_processing_no_status_transition",
          requestId,
          orderId,
        });
      }

      const hasProcessingEvent = await orderEventsRepo.hasEvent(
        orderId,
        "payment_processing",
      );
      if (!hasProcessingEvent) {
        await orderEventsRepo.insertEvent({
          orderId,
          type: "payment_processing",
          message: `Payment processing via ${paymentIntent.payment_method_types?.[0] ?? "unknown method"}.`,
        });
      }

      log({
        level: "info",
        layer: "api",
        message: "payment_processing_async",
        requestId,
        orderId,
        paymentIntentId,
        paymentMethod: paymentIntent.payment_method_types?.[0],
        hasGuestToken: Boolean(guestAccessToken),
      });

      // Return 202 Accepted with processing flag
      // Frontend should redirect to success page with processing state
      // ✅ FIX: Include guestAccessToken in response
      return json(
        {
          success: true,
          processing: true,
          orderId,
          guestAccessToken, // ✅ Critical: Include token for guest orders
          requestId,
        },
        202,
      );
    }

    // Handle redirect flows (3D Secure, bank redirects, etc.)
    if (paymentIntent.status === "requires_action") {
      log({
        level: "info",
        layer: "api",
        message: "payment_requires_action",
        requestId,
        orderId,
        paymentIntentId,
      });

      // Frontend should handle the redirect
      return json(
        { success: true, requiresAction: true, orderId, guestAccessToken, requestId },
        202,
      );
    }

    // Payment must be succeeded at this point for instant methods (cards)
    if (paymentIntent.status !== "succeeded") {
      return json(
        {
          error: "Payment not completed",
          code: "PAYMENT_NOT_SUCCEEDED",
          status: paymentIntent.status,
          requestId,
        },
        409,
      );
    }

    // Amount validation
    const expectedAmount = Math.round(Number(order.total ?? 0) * 100);
    if (paymentIntent.amount !== expectedAmount) {
      return json(
        {
          error: "Payment amount mismatch",
          code: "PAYMENT_AMOUNT_MISMATCH",
          requestId,
        },
        409,
      );
    }

    // Fulfillment validation
    const expectedFulfillment = order.fulfillment === "pickup" ? "pickup" : "ship";
    if (fulfillment && fulfillment !== expectedFulfillment) {
      return json(
        {
          error: "Fulfillment mismatch",
          code: "FULFILLMENT_MISMATCH",
          requestId,
        },
        409,
      );
    }

    // ---------- Mark paid & decrement inventory ----------
    const orderItems = await ordersRepo.getOrderItems(orderId);

    await ensureGuestContactForStatusTransitions({
      order,
      orderId,
      requestId,
      stripeAccountId,
      guestEmail: guestEmail ?? null,
      paymentIntent,
      ordersRepo,
    });

    let didMarkPaid = false;
    try {
      didMarkPaid = await ordersRepo.markPaidTransactionally(
        orderId,
        paymentIntentId,
        orderItems.map((i) => ({
          productId: i.product_id,
          variantId: i.variant_id,
          quantity: i.quantity,
        })),
      );
    } catch (rpcError) {
      const details = extractErrorDetails(rpcError);
      log({
        level: "error",
        layer: "api",
        message: "mark_paid_rpc_threw",
        requestId,
        orderId,
        error: details.message,
        code: details.code,
        details: details.details,
        hint: details.hint,
      });
    }

    if (!didMarkPaid) {
      const { data: fallbackRow, error: fallbackError } = await adminSupabase
        .from("orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", orderId)
        .in("status", ["pending", "processing"])
        .select("id")
        .maybeSingle();

      if (fallbackError) {
        throw fallbackError;
      }
      if (fallbackRow) {
        didMarkPaid = true;
        log({
          level: "warn",
          layer: "api",
          message: "order_marked_paid_via_fallback",
          requestId,
          orderId,
        });
      } else {
        log({
          level: "info",
          layer: "api",
          message: "mark_paid_no_transition",
          requestId,
          orderId,
        });
      }
    }

    const currentOrder = await ordersRepo.getById(orderId);
    if (currentOrder?.status !== "paid") {
      throw new Error(
        "Order payment was captured by Stripe but the order could not be marked paid",
      );
    }
    const postPaymentOrder = currentOrder ?? order;

    if (didMarkPaid) {
      // Sync size tags
      const productService = new ProductService(adminSupabase);
      const productIds = [...new Set(orderItems.map((i) => i.product_id))];
      for (const pid of productIds) {
        await productService.syncSizeTags(pid);
      }

      // Record nexus sale
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
        } catch (nexusErr) {
          log({
            level: "warn",
            layer: "api",
            message: "nexus_tracking_failed",
            requestId,
            orderId,
            error: nexusErr instanceof Error ? nexusErr.message : String(nexusErr),
          });
        }
      }
    }

    // Record paid event
    const hasPaidEvent = await orderEventsRepo.hasEvent(orderId, "paid");
    if (!hasPaidEvent) {
      await orderEventsRepo.insertEvent({
        orderId,
        type: "paid",
        message: "Payment confirmed.",
      });
    }

    // ---------- Save shipping snapshot ----------
    const addressesRepo = new AddressesRepository(adminSupabase);
    const resolvedShipping =
      shippingAddress ??
      (paymentIntent.shipping?.address
        ? {
            name: paymentIntent.shipping.name ?? null,
            phone: paymentIntent.shipping.phone ?? null,
            line1: paymentIntent.shipping.address.line1 ?? null,
            line2: paymentIntent.shipping.address.line2 ?? null,
            city: paymentIntent.shipping.address.city ?? null,
            state: paymentIntent.shipping.address.state ?? null,
            postal_code: paymentIntent.shipping.address.postal_code ?? null,
            country: paymentIntent.shipping.address.country ?? null,
          }
        : null);

    if (expectedFulfillment === "ship" && resolvedShipping?.line1) {
      await addressesRepo.insertOrderShippingSnapshot(orderId, {
        name: resolvedShipping.name,
        phone: resolvedShipping.phone,
        line1: resolvedShipping.line1,
        line2: resolvedShipping.line2 ?? null,
        city: resolvedShipping.city,
        state: resolvedShipping.state,
        postalCode: resolvedShipping.postal_code,
        country: resolvedShipping.country,
      });

      if (postPaymentOrder.user_id) {
        await addressesRepo.upsertUserAddress(postPaymentOrder.user_id, {
          name: resolvedShipping.name,
          phone: resolvedShipping.phone,
          line1: resolvedShipping.line1,
          line2: resolvedShipping.line2 ?? null,
          city: resolvedShipping.city,
          state: resolvedShipping.state,
          postalCode: resolvedShipping.postal_code,
          country: resolvedShipping.country,
        });
      }

      await ordersRepo.setFulfillmentStatus(orderId, "unfulfilled");
    }

    // Pickup chat
    if (expectedFulfillment === "pickup" && postPaymentOrder.user_id) {
      try {
        const chatService = new ChatService(adminSupabase, adminSupabase);
        await chatService.createChatForUser({
          userId: postPaymentOrder.user_id,
          orderId,
        });
      } catch (chatErr) {
        log({
          level: "warn",
          layer: "api",
          message: "pickup_chat_failed",
          requestId,
          orderId,
          error: chatErr instanceof Error ? chatErr.message : String(chatErr),
        });
      }
    }

    // ---------- Send emails (async, non-blocking) ----------
    void sendOrderEmails({
      order: postPaymentOrder,
      orderId,
      orderItems,
      expectedFulfillment,
      paymentIntent,
      addressesRepo,
      ordersRepo,
      orderEventsRepo,
      profilesRepo,
      adminSupabase,
      requestId,
      guestAccessToken, // ✅ Pass token to email function
    });

    return json(
      { success: true, alreadyPaid: !didMarkPaid, guestAccessToken, requestId },
      200,
    );
  } catch (error: unknown) {
    // ✅ FIX: Better error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logError(new Error(errorMessage), {
      layer: "api",
      requestId,
      route: "/api/checkout/confirm-payment",
      originalError: error,
      stack: errorStack,
    });

    return json(
      {
        error: errorMessage,
        requestId,
      },
      500,
    );
  }
}

// ---------- Non-blocking email logic ----------

async function sendOrderEmails(ctx: {
  order: OrderRow;
  orderId: string;
  orderItems: OrderItemRow[];
  expectedFulfillment: "ship" | "pickup";
  paymentIntent: Stripe.PaymentIntent;
  addressesRepo: AddressesRepository;
  ordersRepo: OrdersRepository;
  orderEventsRepo: OrderEventsRepository;
  profilesRepo: ProfileRepository;
  adminSupabase: AdminSupabaseClient;
  requestId: string;
  guestAccessToken: string | null; // ✅ Token passed from parent
}) {
  try {
    const orderEmailService = new OrderEmailService();
    const adminOrderEmailService = new AdminOrderEmailService();

    // Resolve email
    let email = ctx.paymentIntent.receipt_email ?? null;
    if (!email && ctx.order.user_id) {
      const profile = await ctx.profilesRepo.getByUserId(ctx.order.user_id);
      email = profile?.email ?? null;
    }
    if (!email) {
      email = ctx.order.guest_email ?? null;
    }
    if (isPlaceholderEmail(email)) {
      email = null;
    }

    // Update guest email if needed
    if (!ctx.order.user_id && email && ctx.order.guest_email !== email) {
      await ctx.ordersRepo.updateGuestEmail(ctx.order.id, email);
    }

    if (!email) {
      return;
    }

    // Order URL for guests (using pre-created token)
    let orderUrl: string | null = null;
    if (!ctx.order.user_id && ctx.guestAccessToken) {
      orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${ctx.orderId}?token=${encodeURIComponent(ctx.guestAccessToken)}`;
    }

    // Build items for email
    const detailedItems = (await ctx.ordersRepo.getOrderItemsDetailed(
      ctx.orderId,
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
      ctx.expectedFulfillment === "ship"
        ? await ctx.addressesRepo.getOrderShipping(ctx.orderId)
        : null;

    // Confirmation email
    const hasConfirmation = await ctx.orderEventsRepo.hasEvent(
      ctx.orderId,
      "confirmation_email_sent",
    );
    if (!hasConfirmation) {
      await orderEmailService.sendOrderConfirmation({
        to: email,
        orderId: ctx.orderId,
        createdAt: ctx.order.created_at ?? new Date().toISOString(),
        fulfillment: ctx.expectedFulfillment,
        currency: ctx.order.currency ?? "USD",
        subtotal: Number(ctx.order.subtotal ?? 0),
        shipping: Number(ctx.order.shipping ?? 0),
        tax: Number(ctx.order.tax_amount ?? 0),
        total: Number(ctx.order.total ?? 0),
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
      await ctx.orderEventsRepo.insertEvent({
        orderId: ctx.orderId,
        type: "confirmation_email_sent",
        message: "Order confirmation emailed.",
      });
    }

    // Pickup instructions
    if (ctx.expectedFulfillment === "pickup") {
      const hasPickup = await ctx.orderEventsRepo.hasEvent(
        ctx.orderId,
        "pickup_instructions_sent",
      );
      if (!hasPickup) {
        await orderEmailService.sendPickupInstructions({
          to: email,
          orderId: ctx.orderId,
          orderUrl,
        });
        await ctx.orderEventsRepo.insertEvent({
          orderId: ctx.orderId,
          type: "pickup_instructions_sent",
          message: "Pickup instructions emailed.",
        });
      }
    }

    // Admin emails
    const hasAdminEmail = await ctx.orderEventsRepo.hasEvent(
      ctx.orderId,
      "admin_order_email_sent",
    );
    if (!hasAdminEmail) {
      const staff = await ctx.profilesRepo.listStaffProfiles();
      const recipients = staff.filter(
        (s) => s.admin_order_notifications_enabled !== false && s.email,
      );
      if (recipients.length > 0) {
        const itemCount = ctx.orderItems.reduce(
          (sum, i) => sum + Number(i.quantity ?? 0),
          0,
        );
        await Promise.all(
          recipients.map((admin) =>
            adminOrderEmailService.sendOrderPlaced({
              to: admin.email ?? "",
              orderId: ctx.orderId,
              fulfillment: ctx.expectedFulfillment,
              subtotal: Number(ctx.order.subtotal ?? 0),
              shipping: Number(ctx.order.shipping ?? 0),
              tax: Number(ctx.order.tax_amount ?? 0),
              total: Number(ctx.order.total ?? 0),
              itemCount,
              customerEmail: email,
            }),
          ),
        );
        await ctx.orderEventsRepo.insertEvent({
          orderId: ctx.orderId,
          type: "admin_order_email_sent",
          message: "Admin notified.",
        });
      }
    }
  } catch (err) {
    log({
      level: "warn",
      layer: "api",
      message: "order_email_failed",
      requestId: ctx.requestId,
      orderId: ctx.orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
