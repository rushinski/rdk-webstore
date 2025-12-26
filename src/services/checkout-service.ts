// src/services/checkout-service.ts (CORRECTED)

import Stripe from "stripe";
import { z } from "zod";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { env } from "@/config/env";
import { createCartHash } from "@/lib/crypto";
import type { CheckoutSessionRequest, CheckoutSessionResponse } from "@/types/views/checkout";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover", // FIXED: Updated API version
});

const checkoutRequestSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  fulfillment: z.enum(["ship", "pickup"]),
  idempotencyKey: z.string().uuid(),
});

export class CheckoutService {
  private ordersRepo: OrdersRepository;
  private productsRepo: ProductRepository;
  private profilesRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.productsRepo = new ProductRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
  }

  async createCheckoutSession(
    request: CheckoutSessionRequest,
    userId: string | null
  ): Promise<CheckoutSessionResponse> {
    // Validate input
    const validated = checkoutRequestSchema.parse(request);

    const { items, fulfillment, idempotencyKey } = validated;

    // Fetch product data
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      throw new Error("No valid products found");
    }

    // Build product map
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Compute subtotal and validate stock
    let subtotal = 0;
    const lineItems: Array<{
      productId: string;
      variantId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      name: string;
      brand: string;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new Error(`Variant ${item.variantId} not found`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} (${variant.sizeLabel})`);
      }

      const unitPrice = variant.priceCents / 100;
      const lineTotal = unitPrice * item.quantity;

      lineItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        name: product.name,
        brand: product.brand,
      });

      subtotal += lineTotal;
    }

    // Compute shipping (max of default_shipping_price, not multiplied by quantity)
    let shipping = 0;
    if (fulfillment === "ship") {
      const shippingPrices = items.map((item) => {
        const product = productMap.get(item.productId);
        return product?.defaultShippingPrice ?? 0;
      });
      shipping = Math.max(...shippingPrices, 0);
    }

    const total = subtotal + shipping;

    // Create cart hash
    const cartHash = createCartHash(items, fulfillment);

    // Check for existing order with this idempotency key
    const existingOrder = await this.ordersRepo.getByIdempotencyKey(idempotencyKey);

    if (existingOrder) {
      // Check if expired
      const expiresAt = new Date(existingOrder.expires_at!);
      if (expiresAt < new Date()) {
        throw new Error("IDEMPOTENCY_KEY_EXPIRED");
      }

      // Check if cart hash matches
      if (existingOrder.cart_hash !== cartHash) {
        throw new Error("CART_MISMATCH");
      }

      // Return existing session
      if (existingOrder.stripe_session_id) {
        return {
          url: `https://checkout.stripe.com/pay/${existingOrder.stripe_session_id}`,
          orderId: existingOrder.id,
          stripeSessionId: existingOrder.stripe_session_id,
        };
      }
    }

    // Create pending order
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const order = existingOrder ?? await this.ordersRepo.createPendingOrder({
      userId,
      tenantId: "test", // TODO: extract from context
      currency: "USD",
      subtotal,
      shipping,
      total,
      fulfillment,
      idempotencyKey,
      cartHash,
      expiresAt,
      items: lineItems.map((li) => ({
        productId: li.productId,
        variantId: li.variantId,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    });

    // Get or create Stripe customer for signed-in users
    let stripeCustomerId: string | undefined;
    if (userId) {
      const profile = await this.profilesRepo.getByUserId(userId);
      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
      } else {
        const { data: userData } = await this.supabase.auth.getUser();
        // FIXED: Handle nullable email
        if (userData?.user?.email) {
          const customer = await stripe.customers.create({
            email: userData.user.email,
            metadata: { userId },
          });
          stripeCustomerId = customer.id;

          // Save customer ID
          await this.supabase
            .from("profiles")
            .update({ stripe_customer_id: stripeCustomerId })
            .eq("id", userId);
        }
      }
    }

    // Create Stripe Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems.map((li) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${li.brand} - ${li.name}`,
          },
          unit_amount: Math.round(li.unitPrice * 100),
        },
        quantity: li.quantity,
      })),
      // FIXED: Use NEXT_PUBLIC_SITE_URL from env
      success_url: `${env.NEXT_PUBLIC_SITE_URL}/checkout/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/checkout/cancel`,
      metadata: {
        order_id: order.id,
        fulfillment,
        cart_hash: cartHash,
      },
    };

    // Add customer or customer_email
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else {
      const { data: userData } = await this.supabase.auth.getUser();
      if (userData?.user?.email) {
        sessionParams.customer_email = userData.user.email;
      }
    }

    // Add shipping for "ship" fulfillment
    if (fulfillment === "ship") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["US"],
      };
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(shipping * 100),
              currency: "usd",
            },
            display_name: "Standard Shipping",
          },
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey, // Use same idempotency key for Stripe
    });

    // Update order with Stripe session ID
    await this.ordersRepo.updateStripeSession(order.id, session.id);

    return {
      url: session.url!,
      orderId: order.id,
      stripeSessionId: session.id,
    };
  }
}