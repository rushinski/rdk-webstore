// src/app/api/checkout/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { createCartHash } from "@/lib/crypto";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { log, logError } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid items" },
        { status: 400 }
      );
    }

    // Fetch products
    const productsRepo = new ProductRepository(supabase);
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found" },
        { status: 400 }
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
        { error: "Checkout requires a single tenant" },
        { status: 400 }
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
    const shippingCosts = lineItems.map((item) => {
      const costInCents = shippingDefaultsMap.get(item.category) ?? 0;
      return costInCents / 100;
    });
    const shipping = Math.max(...shippingCosts, 0);

    const total = subtotal + shipping;

    // Create pending order
    const ordersRepo = new OrdersRepository(supabase);
    const idempotencyKey = generateIdempotencyKey();
    const cartHash = createCartHash(items, "ship"); // Default to ship for now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const order = await ordersRepo.createPendingOrder({
      userId,
      tenantId,
      currency: "USD",
      subtotal,
      shipping,
      total,
      fulfillment: "ship", // Will be updated on confirmation
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
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        order_id: order.id,
        cart_hash: cartHash,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    log({
      level: "info",
      layer: "api",
      message: "payment_intent_created",
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      route: "/api/checkout/create-payment-intent",
    });

    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}