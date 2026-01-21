// src/app/api/checkout/update-fulfillment/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { createCartHash } from "@/lib/crypto";
import { updateFulfillmentSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
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
    const parsed = updateFulfillmentSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { orderId, fulfillment, shippingAddress } = parsed.data;

    const ordersRepo = new OrdersRepository(adminSupabase);
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

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "ORDER_NOT_PENDING", code: "ORDER_NOT_PENDING", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "MISSING_PAYMENT_INTENT", code: "MISSING_PAYMENT_INTENT", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const orderItems = await ordersRepo.getOrderItems(orderId);
    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: "Order has no items", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const productIds = [...new Set(orderItems.map((item) => item.product_id))];
    const productsRepo = new ProductRepository(adminSupabase);
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const tenantIds = new Set(
      products
        .map((product) => product.tenantId)
        .filter((id): id is string => Boolean(id)),
    );
    if (tenantIds.size !== 1) {
      return NextResponse.json(
        { error: "Checkout requires a single tenant", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const [tenantId] = [...tenantIds];
    const tenantProfileRepo = new ProfileRepository(adminSupabase);
    const tenantStripeAccountId =
      await tenantProfileRepo.getStripeAccountIdForTenant(tenantId);

    const categories = [...new Set(products.map((product) => product.category))];
    const shippingDefaultsRepo = new ShippingDefaultsRepository(adminSupabase);
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(
      tenantId,
      categories,
    );
    const shippingDefaultsMap = new Map(
      shippingDefaults.map((row) => [row.category, Number(row.shipping_cost_cents ?? 0)]),
    );

    const subtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0,
    );

    let shipping = 0;
    if (fulfillment === "ship") {
      const shippingCosts = orderItems.map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) return 0;
        const costInCents = shippingDefaultsMap.get(product.category) ?? 0;
        return costInCents / 100;
      });
      shipping = Math.max(...shippingCosts, 0);
    }

    const taxSettingsRepo = new TaxSettingsRepository(adminSupabase);
    const taxSettings = await taxSettingsRepo.getByTenant(tenantId);
    const homeState = (taxSettings?.home_state ?? "SC").trim().toUpperCase();
    const taxEnabled = taxSettings?.tax_enabled ?? false;
    const taxCodeOverrides =
      taxSettings?.tax_code_overrides && typeof taxSettings.tax_code_overrides === "object"
        ? (taxSettings.tax_code_overrides as Record<string, string>)
        : {};

    const taxService = tenantStripeAccountId
      ? new StripeTaxService(adminSupabase, tenantStripeAccountId)
      : null;
    const destinationState =
      fulfillment === "pickup"
        ? homeState
        : shippingAddress?.state?.trim().toUpperCase() ?? null;
    const stripeRegistrations =
      taxEnabled && destinationState && taxService
        ? await taxService.getStripeRegistrations()
        : new Map<string, { id: string; state: string; active: boolean }>();

    let customerAddress: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null = null;

    if (fulfillment === "ship" && shippingAddress) {
      customerAddress = {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 ?? null,
        city: shippingAddress.city,
        state: shippingAddress.state.trim().toUpperCase(),
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      };
    } else if (fulfillment === "pickup" && taxService) {
      const officeAddress = await taxService.getHeadOfficeAddress();
      if (officeAddress) {
        customerAddress = officeAddress;
      } else {
        customerAddress = {
          line1: "123 Main St",
          city: "Charleston",
          state: homeState,
          postal_code: "29401",
          country: "US",
        };
      }
    }

    const taxLineItems = orderItems.map((item) => {
      const product = productMap.get(item.product_id);
      return {
        amount: Math.round(Number(item.unit_price ?? 0) * 100),
        quantity: Number(item.quantity ?? 0),
        productId: item.product_id,
        category: product?.category ?? "other",
      };
    });

    const hasStripeRegistration = taxEnabled && destinationState
      ? stripeRegistrations.get(destinationState)?.active ?? false
      : false;

    const taxCalc = hasStripeRegistration && customerAddress && taxService
      ? await taxService.calculateTax({
          currency: "usd",
          customerAddress,
          lineItems: taxLineItems,
          shippingCost: Math.round(shipping * 100),
          taxCodes: taxCodeOverrides,
          taxEnabled,
        })
      : {
          taxAmount: 0,
          totalAmount: Math.round((subtotal + shipping) * 100),
          taxCalculationId: null,
        };

    const tax = taxCalc.taxAmount / 100;
    const total = subtotal + shipping + tax;
    const cartHash = createCartHash(
      orderItems.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      })),
      fulfillment,
    );

    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.stripe_payment_intent_id,
    );

    if (paymentIntent.status === "succeeded") {
      return NextResponse.json(
        { error: "ORDER_ALREADY_PAID", code: "ORDER_ALREADY_PAID", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (paymentIntent.status === "canceled") {
      return NextResponse.json(
        { error: "PAYMENT_INTENT_CANCELED", code: "PAYMENT_INTENT_CANCELED", requestId },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
      amount: Math.round(total * 100),
      metadata: {
        fulfillment,
        cart_hash: cartHash,
        tax_calculation_id: taxCalc.taxCalculationId ?? "",
      },
    });

    await adminSupabase
      .from("orders")
      .update({
        subtotal,
        shipping,
        tax_amount: tax,
        tax_calculation_id: taxCalc.taxCalculationId,
        total,
        fulfillment,
        cart_hash: cartHash,
        customer_state: destinationState,
      })
      .eq("id", orderId);

    return NextResponse.json(
      { subtotal, shipping, tax, total, fulfillment, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/update-fulfillment",
    });

    return NextResponse.json(
      { error: "Failed to update fulfillment", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
