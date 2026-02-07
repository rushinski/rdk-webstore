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

    // ---------- Handle payment status ----------

    // CRITICAL: BNPL methods (Afterpay, Affirm, Klarna) are "processing" initially.
    // This is NORMAL and EXPECTED. The payment will settle asynchronously and
    // the webhook will handle the final transition to "succeeded".
    // DO NOT treat "processing" as an error!
    if (paymentIntent.status === "processing") {
      // Mark order as "processing" so it's tracked but not yet counted as revenue
      await adminSupabase
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId)
        .eq("status", "pending"); // only if still pending

      const orderEventsRepo = new OrderEventsRepository(adminSupabase);
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

      // ✅ CRITICAL FIX: Create access token for guest orders NOW
      // Before any async operations so the processing page can poll immediately
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
      return json({ success: true, requiresAction: true, orderId, requestId }, 202);
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
    const orderEventsRepo = new OrderEventsRepository(adminSupabase);
    const orderItems = await ordersRepo.getOrderItems(orderId);

    // ✅ Update guest email if order doesn't have one yet
    if (!order.user_id && !order.guest_email) {
      // Priority: 1) frontend guestEmail, 2) Stripe receipt_email, 3) placeholder
      const email = guestEmail || paymentIntent.receipt_email || null;

      if (email) {
        log({
          level: "info",
          layer: "api",
          message: "updating_guest_email",
          requestId,
          orderId,
          emailSource: guestEmail ? "frontend" : "stripe",
        });
        await ordersRepo.updateGuestEmail(orderId, email);
        order.guest_email = email;
      } else {
        // Only use placeholder if absolutely no email was found
        const placeholder = `guest-${orderId}@placeholder.local`;
        log({
          level: "warn",
          layer: "api",
          message: "guest_email_missing_using_placeholder",
          requestId,
          orderId,
          guestEmailFromRequest: Boolean(guestEmail),
          receiptEmailFromStripe: Boolean(paymentIntent.receipt_email),
        });
        await ordersRepo.updateGuestEmail(orderId, placeholder);
        order.guest_email = placeholder;
      }
    }

    const didMarkPaid = await ordersRepo.markPaidTransactionally(
      orderId,
      paymentIntentId,
      orderItems.map((i) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      })),
    );

    if (didMarkPaid) {
      // Sync size tags
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

      if (order.user_id) {
        await addressesRepo.upsertUserAddress(order.user_id, {
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
    if (expectedFulfillment === "pickup" && order.user_id) {
      try {
        const chatService = new ChatService(adminSupabase, adminSupabase);
        await chatService.createChatForUser({ userId: order.user_id, orderId });
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

    // ✅ CRITICAL FIX: Create access token for guest orders BEFORE async email
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

    // ---------- Send emails (async, non-blocking) ----------
    void sendOrderEmails({
      order,
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
