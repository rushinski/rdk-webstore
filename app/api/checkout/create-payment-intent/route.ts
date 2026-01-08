// src/app/api/checkout/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { createCartHash } from "@/lib/crypto";
import { checkoutSessionSchema } from "@/lib/validation/checkout";
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
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const userEmail = user?.email ?? null;

    const body = await request.json().catch(() => null);
    const parsed = checkoutSessionSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { items, idempotencyKey, fulfillment } = parsed.data;

    const normalizedFulfillment = fulfillment === "pickup" ? "pickup" : "ship";
    const cartHash = createCartHash(items, normalizedFulfillment);
    const ordersRepo = new OrdersRepository(supabase);

    const existingOrder = await ordersRepo.getByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      const expiresAt = existingOrder.expires_at ? new Date(existingOrder.expires_at) : null;
      if (expiresAt && expiresAt < new Date()) {
        return NextResponse.json(
          { error: "IDEMPOTENCY_KEY_EXPIRED", code: "IDEMPOTENCY_KEY_EXPIRED", requestId },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      if (existingOrder.cart_hash !== cartHash) {
        return NextResponse.json(
          { error: "CART_MISMATCH", code: "CART_MISMATCH", requestId },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      if (existingOrder.status === "paid") {
        return NextResponse.json(
          { status: "paid", orderId: existingOrder.id, requestId },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (existingOrder.stripe_payment_intent_id) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          existingOrder.stripe_payment_intent_id
        );

        if (paymentIntent.status === "succeeded") {
          return NextResponse.json(
            { status: "paid", orderId: existingOrder.id, requestId },
            { headers: { "Cache-Control": "no-store" } }
          );
        }

        if (paymentIntent.status === "canceled") {
          return NextResponse.json(
            { error: "PAYMENT_INTENT_CANCELED", code: "PAYMENT_INTENT_CANCELED", requestId },
            { status: 409, headers: { "Cache-Control": "no-store" } }
          );
        }

        return NextResponse.json(
          {
            clientSecret: paymentIntent.client_secret,
            orderId: existingOrder.id,
            paymentIntentId: paymentIntent.id,
            subtotal: Number(existingOrder.subtotal ?? 0),
            shipping: Number(existingOrder.shipping ?? 0),
            total: Number(existingOrder.total ?? 0),
            fulfillment: existingOrder.fulfillment ?? normalizedFulfillment,
            requestId,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    if (existingOrder && !existingOrder.stripe_payment_intent_id) {
      const subtotal = Number(existingOrder.subtotal ?? 0);
      const shipping = Number(existingOrder.shipping ?? 0);
      const total = Number(existingOrder.total ?? 0);

      // Get or create Stripe customer
      let stripeCustomerId: string | undefined;
      let receiptEmail: string | undefined;
      if (userId) {
        const profileRepo = new ProfileRepository(supabase);
        const profile = await profileRepo.getByUserId(userId);
        if (profile?.stripe_customer_id) {
          stripeCustomerId = profile.stripe_customer_id;
        } else if (user?.email) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId },
          });
          stripeCustomerId = customer.id;
          await profileRepo.setStripeCustomerId(userId, stripeCustomerId);
        }
        receiptEmail = userEmail ?? profile?.email ?? undefined;
      }

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(total * 100),
          currency: "usd",
          customer: stripeCustomerId,
          receipt_email: receiptEmail,
          metadata: {
            order_id: existingOrder.id,
            cart_hash: cartHash,
            fulfillment: existingOrder.fulfillment ?? normalizedFulfillment,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        },
        { idempotencyKey }
      );

      await ordersRepo.updateStripePaymentIntent(existingOrder.id, paymentIntent.id);

      return NextResponse.json(
        {
          clientSecret: paymentIntent.client_secret,
          orderId: existingOrder.id,
          paymentIntentId: paymentIntent.id,
          subtotal,
          shipping,
          total,
          fulfillment: existingOrder.fulfillment ?? normalizedFulfillment,
          requestId,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Fetch products
    const productsRepo = new ProductRepository(supabase);
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Build product map
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate single tenant
    const tenantIds = new Set(
      products.map((p) => p.tenantId).filter((id): id is string => Boolean(id))
    );
    if (tenantIds.size !== 1) {
      return NextResponse.json(
        { error: "Checkout requires a single tenant", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const [tenantId] = [...tenantIds];

    // Get shipping defaults
    const categories = [...new Set(products.map((p) => p.category))];
    const shippingDefaultsRepo = new ShippingDefaultsRepository(supabase);
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(tenantId, categories);
    const shippingDefaultsMap = new Map(
      shippingDefaults.map((row) => [row.category, Number(row.shipping_cost_cents ?? 0)])
    );

    // Build line items
    const lineItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product not found");

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) throw new Error("Variant not found");
      if (variant.stock < item.quantity) throw new Error("INSUFFICIENT_STOCK");

      const unitPrice = Number(variant.priceCents ?? 0) / 100;
      const unitCost = Number(variant.costCents ?? 0) / 100;
      const lineTotal = unitPrice * item.quantity;

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        lineTotal,
        category: product.category,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // Calculate max shipping (flat rate)
    let shipping = 0;
    if (normalizedFulfillment === "ship") {
      const shippingCosts = lineItems.map((item) => {
        const costInCents = shippingDefaultsMap.get(item.category) ?? 0;
        return costInCents / 100;
      });
      shipping = Math.max(...shippingCosts, 0);
    }

    const total = subtotal + shipping;

    // Create pending order
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const order = await ordersRepo.createPendingOrder({
      userId,
      tenantId,
      currency: "USD",
      subtotal,
      shipping,
      total,
      fulfillment: normalizedFulfillment,
      idempotencyKey,
      cartHash,
      expiresAt,
      items: lineItems.map((li) => ({
        productId: li.productId,
        variantId: li.variantId,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        unitCost: li.unitCost,
        lineTotal: li.lineTotal,
      })),
    });

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    let receiptEmail: string | undefined;
    if (userId) {
      const profileRepo = new ProfileRepository(supabase);
      const profile = await profileRepo.getByUserId(userId);
      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
      } else if (user?.email) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
        await profileRepo.setStripeCustomerId(userId, stripeCustomerId);
      }
      receiptEmail = userEmail ?? profile?.email ?? undefined;
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(total * 100),
        currency: "usd",
        customer: stripeCustomerId,
        receipt_email: receiptEmail,
        metadata: {
          order_id: order.id,
          cart_hash: cartHash,
          fulfillment: normalizedFulfillment,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      { idempotencyKey }
    );

    log({
      level: "info",
      layer: "api",
      message: "payment_intent_created",
      requestId,
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
    });

    if (!order.stripe_payment_intent_id) {
      await ordersRepo.updateStripePaymentIntent(order.id, paymentIntent.id);
    }

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        subtotal,
        shipping,
        total,
        fulfillment: normalizedFulfillment,
        requestId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/create-payment-intent",
    });

    return NextResponse.json(
      { error: error.message || "Failed to create payment intent", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}