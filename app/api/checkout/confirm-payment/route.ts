// src/app/api/checkout/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { OrdersRepository } from "@/repositories/orders-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { ProductService } from "@/services/product-service";
import { ChatService } from "@/services/chat-service";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { OrderEmailService } from "@/services/order-email-service";
import { ProfileRepository } from "@/repositories/profile-repo";
import { log, logError } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    
    const body = await request.json();
    const { orderId, paymentIntentId, fulfillment, shippingAddress } = body;

    if (!orderId || !paymentIntentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ordersRepo = new OrdersRepository(supabase);
    const order = await ordersRepo.getById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "paid") {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.order_id && paymentIntent.metadata.order_id !== orderId) {
      return NextResponse.json(
        { error: "Payment intent does not match order", code: "PAYMENT_INTENT_MISMATCH" },
        { status: 409 }
      );
    }

    if (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent already attached to order", code: "PAYMENT_INTENT_CONFLICT" },
        { status: 409 }
      );
    }

    if (paymentIntent.status === "processing") {
      return NextResponse.json({ success: true, processing: true }, { status: 202 });
    }

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed", code: "PAYMENT_NOT_SUCCEEDED" },
        { status: 409 }
      );
    }

    const expectedAmount = Math.round(Number(order.total ?? 0) * 100);
    const expectedCurrency = (order.currency ?? "USD").toLowerCase();
    if (
      paymentIntent.amount !== expectedAmount ||
      paymentIntent.currency?.toLowerCase() !== expectedCurrency
    ) {
      return NextResponse.json(
        { error: "Payment amount mismatch", code: "PAYMENT_AMOUNT_MISMATCH" },
        { status: 409 }
      );
    }

    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(orderId, paymentIntentId);
    }

    if (fulfillment && fulfillment !== order.fulfillment) {
      return NextResponse.json(
        { error: "Fulfillment mismatch. Please refresh checkout.", code: "FULFILLMENT_MISMATCH" },
        { status: 409 }
      );
    }

    // Get order items and decrement inventory
    const orderItems = await ordersRepo.getOrderItems(orderId);
    const itemsToDecrement = orderItems.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    }));

    const didMarkPaid = await ordersRepo.markPaidTransactionally(orderId, paymentIntentId, itemsToDecrement);
    if (!didMarkPaid) {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    // Sync size tags
    const productService = new ProductService(supabase);
    const productIds = [...new Set(orderItems.map((item) => item.product_id))];
    for (const productId of productIds) {
      await productService.syncSizeTags(productId);
    }

    // Save shipping address if provided
    if (fulfillment === "ship" && shippingAddress) {
      const addressesRepo = new AddressesRepository(supabase);
      await addressesRepo.insertOrderShippingSnapshot(orderId, shippingAddress);

      if (order.user_id) {
        await addressesRepo.upsertUserAddress(order.user_id, shippingAddress);
      }

      // Set fulfillment status for admin queue
      await ordersRepo.setFulfillmentStatus(orderId, 'unfulfilled');
    }

    // Create chat for pickup orders
    if (fulfillment === "pickup" && adminSupabase) {
      try {
        const chatService = new ChatService(adminSupabase, adminSupabase);
        if (order.user_id) {
          await chatService.createChatForUser({ userId: order.user_id, orderId: order.id });
        } else if (order.public_token) {
          const { data: { user } } = await supabase.auth.getUser();
          await chatService.createChatForGuest({
            orderId: order.id,
            publicToken: order.public_token,
            guestEmail: user?.email ?? null,
          });
        }
      } catch (chatError) {
        log({
          level: "warn",
          layer: "api",
          message: "pickup_chat_create_failed",
          orderId,
          error: chatError instanceof Error ? chatError.message : String(chatError),
        });
      }
    }

    // Send admin notification
    if (adminSupabase) {
      try {
        const notifications = new AdminNotificationService(adminSupabase);
        await notifications.notifyOrderPlaced(orderId);
      } catch (notifyError) {
        log({
          level: "warn",
          layer: "api",
          message: "order_admin_notification_failed",
          orderId,
          error: notifyError instanceof Error ? notifyError.message : String(notifyError),
        });
      }
    }

    // Revalidate cache
    try {
      for (const item of orderItems) {
        revalidateTag(`product:${item.product_id}`, "max");
      }
      revalidateTag("products:list", "max");
    } catch (cacheError) {
      log({
        level: "warn",
        layer: "api",
        message: "cache_revalidation_failed",
        orderId,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
    }

    // Send confirmation email
    try {
      const profileRepo = new ProfileRepository(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      let email = user?.email ?? null;

      if (!email && order.user_id) {
        const profile = await profileRepo.getByUserId(order.user_id);
        email = profile?.email ?? null;
      }

      if (email) {
        const addressesRepo = new AddressesRepository(supabase);
        const shippingSnapshot = fulfillment === "ship" 
          ? await addressesRepo.getOrderShipping(orderId)
          : null;

        const detailedItems = await ordersRepo.getOrderItemsDetailed(orderId);
        const emailService = new OrderEmailService();

        await emailService.sendOrderConfirmation({
          to: email,
          orderId: order.id,
          createdAt: order.created_at ?? new Date().toISOString(),
          fulfillment: fulfillment || "ship",
          currency: order.currency ?? "USD",
          subtotal: Number(order.subtotal ?? 0),
          shipping: Number(order.shipping ?? 0),
          total: Number(order.total ?? 0),
          items: detailedItems.map((item: any) => ({
            title: item.product?.title_display ?? "Item",
            sizeLabel: item.variant?.size_label ?? null,
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.unit_price ?? 0),
            lineTotal: Number(item.line_total ?? 0),
          })),
          shippingAddress: shippingSnapshot ? {
            name: shippingSnapshot.name,
            line1: shippingSnapshot.line1,
            line2: shippingSnapshot.line2,
            city: shippingSnapshot.city,
            state: shippingSnapshot.state,
            postalCode: shippingSnapshot.postal_code,
            country: shippingSnapshot.country,
          } : null,
        });
      }
    } catch (emailError) {
      log({
        level: "warn",
        layer: "api",
        message: "order_email_failed",
        orderId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    log({
      level: "info",
      layer: "api",
      message: "payment_confirmed",
      orderId,
      paymentIntentId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      route: "/api/checkout/confirm-payment",
    });

    return NextResponse.json(
      { error: error.message || "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
