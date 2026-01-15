// app/api/checkout/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import Stripe from "stripe";
import { OrdersRepository } from "@/repositories/orders-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ProductService } from "@/services/product-service";
import { OrderEmailService } from "@/services/order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { ChatService } from "@/services/chat-service";
import { confirmPaymentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

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
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { orderId, paymentIntentId, fulfillment, shippingAddress } = parsed.data;

    const ordersRepo = new OrdersRepository(adminSupabase);
    const orderEventsRepo = new OrderEventsRepository(adminSupabase);
    const addressesRepo = new AddressesRepository(adminSupabase);
    const profilesRepo = new ProfileRepository(adminSupabase);
    const productService = new ProductService(adminSupabase);
    const orderEmailService = new OrderEmailService();
    const orderAccessTokens = new OrderAccessTokenService(adminSupabase);
    const order = await ordersRepo.getById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!userId && order.user_id) {
      return NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (userId && order.user_id && order.user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.order_id && paymentIntent.metadata.order_id !== orderId) {
      return NextResponse.json(
        {
          error: "Payment intent does not match order",
          code: "PAYMENT_INTENT_MISMATCH",
          requestId,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (
      order.stripe_payment_intent_id &&
      order.stripe_payment_intent_id !== paymentIntentId
    ) {
      return NextResponse.json(
        {
          error: "Payment intent already attached to order",
          code: "PAYMENT_INTENT_CONFLICT",
          requestId,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (paymentIntent.status === "processing") {
      return NextResponse.json(
        { success: true, processing: true },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed", code: "PAYMENT_NOT_SUCCEEDED", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const expectedAmount = Math.round(Number(order.total ?? 0) * 100);
    const expectedCurrency = (order.currency ?? "USD").toLowerCase();
    if (
      paymentIntent.amount !== expectedAmount ||
      paymentIntent.currency?.toLowerCase() !== expectedCurrency
    ) {
      return NextResponse.json(
        { error: "Payment amount mismatch", code: "PAYMENT_AMOUNT_MISMATCH", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const expectedFulfillment = order.fulfillment === "pickup" ? "pickup" : "ship";

    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(orderId, paymentIntentId);
    }

    if (fulfillment && fulfillment !== expectedFulfillment) {
      return NextResponse.json(
        {
          error: "Fulfillment mismatch. Please refresh checkout.",
          code: "FULFILLMENT_MISMATCH",
          requestId,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Get order items and decrement inventory
    const orderItems = await ordersRepo.getOrderItems(orderId);
    const itemsToDecrement = orderItems.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    }));

    const didMarkPaid = await ordersRepo.markPaidTransactionally(
      orderId,
      paymentIntentId,
      itemsToDecrement,
    );
    const alreadyPaid = order.status === "paid" || !didMarkPaid;

    if (didMarkPaid) {
      const productIds = [...new Set(orderItems.map((item) => item.product_id))];
      for (const productId of productIds) {
        await productService.syncSizeTags(productId);
      }
    }

    try {
      const hasPaidEvent = await orderEventsRepo.hasEvent(orderId, "paid");
      if (!hasPaidEvent) {
        await orderEventsRepo.insertEvent({
          orderId,
          type: "paid",
          message: "Payment confirmed.",
        });
      }
    } catch (eventError) {
      log({
        level: "warn",
        layer: "api",
        message: "order_event_create_failed",
        requestId,
        orderId,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    const paymentShipping = paymentIntent.shipping?.address
      ? {
          name: paymentIntent.shipping?.name ?? null,
          phone: (paymentIntent.shipping as any)?.phone ?? null,
          line1: paymentIntent.shipping.address?.line1 ?? null,
          line2: paymentIntent.shipping.address?.line2 ?? null,
          city: paymentIntent.shipping.address?.city ?? null,
          state: paymentIntent.shipping.address?.state ?? null,
          postal_code: paymentIntent.shipping.address?.postal_code ?? null, // Changed from postalCode
          country: paymentIntent.shipping.address?.country ?? null,
        }
      : null;

    const resolvedShipping = shippingAddress ?? paymentShipping;

    if (
      expectedFulfillment === "ship" &&
      resolvedShipping?.line1 &&
      resolvedShipping.city &&
      resolvedShipping.state &&
      resolvedShipping.postal_code && // Changed from postalCode
      resolvedShipping.country
    ) {
      await addressesRepo.insertOrderShippingSnapshot(orderId, {
        name: resolvedShipping.name,
        phone: resolvedShipping.phone,
        line1: resolvedShipping.line1,
        line2: resolvedShipping.line2 ?? null,
        city: resolvedShipping.city,
        state: resolvedShipping.state,
        postalCode: resolvedShipping.postal_code, // Convert back to camelCase for repository
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
          postalCode: resolvedShipping.postal_code, // Convert back to camelCase for repository
          country: resolvedShipping.country,
        });
      }

      await ordersRepo.setFulfillmentStatus(orderId, "unfulfilled");
    }

    if (expectedFulfillment === "pickup" && order.user_id) {
      try {
        const chatService = new ChatService(adminSupabase, adminSupabase);
        await chatService.createChatForUser({ userId: order.user_id, orderId: order.id });
      } catch (chatError) {
        log({
          level: "warn",
          layer: "api",
          message: "pickup_chat_create_failed",
          requestId,
          orderId,
          error: chatError instanceof Error ? chatError.message : String(chatError),
        });
      }
    }

    try {
      let email = paymentIntent.receipt_email ?? null;
      if (!email && order.user_id) {
        const profile = await profilesRepo.getByUserId(order.user_id);
        email = profile?.email ?? null;
      }
      if (!email && !order.user_id) {
        email = order.guest_email ?? null;
      }

      if (!order.user_id && email && order.guest_email !== email) {
        await ordersRepo.updateGuestEmail(order.id, email);
      }

      const detailedItems = await ordersRepo.getOrderItemsDetailed(orderId);
      const items = detailedItems.map((item: any) => {
        const product = item.product;
        const title =
          product?.title_display ??
          `${product?.brand ?? ""} ${product?.name ?? ""}`.trim();
        const unitPrice = Number(item.unit_price ?? 0);
        const lineTotal =
          Number(item.line_total ?? 0) || unitPrice * Number(item.quantity ?? 0);
        return {
          title: title || "Item",
          sizeLabel: item.variant?.size_label ?? null,
          quantity: Number(item.quantity ?? 0),
          unitPrice,
          lineTotal,
        };
      });

      const hasConfirmationEvent = await orderEventsRepo.hasEvent(
        order.id,
        "confirmation_email_sent",
      );
      const hasPickupEvent = await orderEventsRepo.hasEvent(
        order.id,
        "pickup_instructions_sent",
      );
      const shouldSendConfirmation = !hasConfirmationEvent;
      const shouldSendPickup = expectedFulfillment === "pickup" && !hasPickupEvent;

      let orderUrl: string | null = null;
      if (!order.user_id && email && (shouldSendConfirmation || shouldSendPickup)) {
        const { token } = await orderAccessTokens.createToken({ orderId: order.id });
        orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${order.id}?token=${encodeURIComponent(token)}`;
      }

      const shippingSnapshot =
        expectedFulfillment === "ship"
          ? await addressesRepo.getOrderShipping(orderId)
          : null;
      const fallbackShipping = shippingSnapshot
        ? null
        : resolvedShipping
          ? {
              name: resolvedShipping.name ?? null,
              line1: resolvedShipping.line1 ?? null,
              line2: resolvedShipping.line2 ?? null,
              city: resolvedShipping.city ?? null,
              state: resolvedShipping.state ?? null,
              postalCode: resolvedShipping.postal_code ?? null, // Changed from postalCode
              country: resolvedShipping.country ?? null,
            }
          : null;

      if (email && shouldSendConfirmation) {
        await orderEmailService.sendOrderConfirmation({
          to: email,
          orderId: order.id,
          createdAt: order.created_at ?? new Date().toISOString(),
          fulfillment: expectedFulfillment,
          currency: order.currency ?? "USD",
          subtotal: Number(order.subtotal ?? 0),
          shipping: Number(order.shipping ?? 0),
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
            : fallbackShipping,
        });

        try {
          await orderEventsRepo.insertEvent({
            orderId: order.id,
            type: "confirmation_email_sent",
            message: "Order confirmation emailed.",
          });
        } catch (eventError) {
          log({
            level: "warn",
            layer: "api",
            message: "order_event_create_failed",
            requestId,
            orderId,
            error: eventError instanceof Error ? eventError.message : String(eventError),
          });
        }
      }

      if (email && shouldSendPickup) {
        await orderEmailService.sendPickupInstructions({
          to: email,
          orderId: order.id,
          orderUrl,
        });

        try {
          await orderEventsRepo.insertEvent({
            orderId: order.id,
            type: "pickup_instructions_sent",
            message: "Pickup instructions emailed.",
          });
        } catch (eventError) {
          log({
            level: "warn",
            layer: "api",
            message: "order_event_create_failed",
            requestId,
            orderId,
            error: eventError instanceof Error ? eventError.message : String(eventError),
          });
        }
      }
    } catch (emailError) {
      log({
        level: "warn",
        layer: "api",
        message: "order_email_send_failed",
        requestId,
        orderId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
    return NextResponse.json(
      { success: true, alreadyPaid },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/confirm-payment",
    });

    return NextResponse.json(
      { error: error.message || "Failed to confirm payment", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
