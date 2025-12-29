import Stripe from "stripe";
import { revalidateTag } from "next/cache";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import { StripeEventsRepository } from "@/repositories/stripe-events-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ProductService } from "@/services/product-service";
import { OrderEmailService } from "@/services/order-email-service";
import { log } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// Helper: some Stripe SDK typings show retrieve() as Response<Session>
function unwrapStripe<T>(value: unknown): T {
  const v = value as any;
  return (v && typeof v === "object" && "data" in v ? v.data : v) as T;
}

export class StripeOrderJob {
  private ordersRepo: OrdersRepository;
  private eventsRepo: StripeEventsRepository;
  private addressesRepo: AddressesRepository;
  private profilesRepo: ProfileRepository;
  private productService: ProductService;
  private orderEmailService: OrderEmailService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.eventsRepo = new StripeEventsRepository(supabase);
    this.addressesRepo = new AddressesRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
    this.productService = new ProductService(supabase);
    this.orderEmailService = new OrderEmailService();
  }

  async processCheckoutSessionCompleted(event: Stripe.Event, requestId: string): Promise<void> {
    const eventId = event.id;

    const alreadyProcessed = await this.eventsRepo.hasProcessed(eventId);
    if (alreadyProcessed) {
      log({ level: "info", layer: "job", message: "stripe_event_already_processed", requestId, stripeEventId: eventId });
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      log({ level: "warn", layer: "job", message: "stripe_event_missing_order_id", requestId, stripeEventId: eventId });
      await this.eventsRepo.recordProcessed(eventId, event.type, event.created, event.data.object);
      return;
    }

    const order = await this.ordersRepo.getById(orderId);
    if (!order) {
      log({ level: "error", layer: "job", message: "stripe_event_order_not_found", requestId, stripeEventId: eventId, orderId });
      await this.eventsRepo.recordProcessed(eventId, event.type, event.created, event.data.object, orderId);
      return;
    }

    if (order.status === "paid") {
      log({ level: "info", layer: "job", message: "stripe_event_order_already_paid", requestId, stripeEventId: eventId, orderId });
      await this.eventsRepo.recordProcessed(eventId, event.type, event.created, event.data.object, orderId);
      return;
    }

    const orderItems = await this.ordersRepo.getOrderItems(orderId);
    const itemsToDecrement = orderItems.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    }));

    const paymentIntentId = session.payment_intent as string;
    await this.ordersRepo.markPaidTransactionally(orderId, paymentIntentId, itemsToDecrement);

    const productIds = [...new Set(orderItems.map((item) => item.product_id))];
    for (const productId of productIds) {
      await this.productService.syncSizeTags(productId);
    }

    let sessionEmail = session.customer_details?.email ?? session.customer_email ?? null;
    let shippingSnapshot = null as Awaited<ReturnType<AddressesRepository["getOrderShipping"]>> | null;
    const fulfillment = order.fulfillment === "pickup" ? "pickup" : "ship";

    const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["customer", "payment_intent"],
    });

    const fullSession = unwrapStripe<Stripe.Checkout.Session>(retrieved);
    sessionEmail = fullSession.customer_details?.email ?? sessionEmail;

    // Save shipping snapshot (ship orders only)
    if (fulfillment === "ship") {
      // Stripe wants you using collected_information.shipping_details (new)
      const shippingDetails =
        fullSession.collected_information?.shipping_details ??
        // fallback for older API versions, if present
        (fullSession as any).shipping_details ??
        null;

      if (shippingDetails) {
        const address = shippingDetails.address;

        const addressInput = {
          name: shippingDetails.name ?? null,
          phone: fullSession.customer_details?.phone ?? null,
          line1: address?.line1 ?? null,
          line2: address?.line2 ?? null,
          city: address?.city ?? null,
          state: address?.state ?? null,
          postalCode: address?.postal_code ?? null,
          country: address?.country ?? null,
        };

        await this.addressesRepo.insertOrderShippingSnapshot(orderId, addressInput);

        if (order.user_id) {
          await this.addressesRepo.upsertUserAddress(order.user_id, addressInput);
        }
      }
    }

    if (fulfillment === "ship") {
      shippingSnapshot = await this.addressesRepo.getOrderShipping(orderId);
    }

    await this.eventsRepo.recordProcessed(eventId, event.type, event.created, event.data.object, orderId);

    // ✅ Next.js 16+ requires 2 args: revalidateTag(tag, profile)
    try {
      for (const item of orderItems) {
        revalidateTag(`product:${item.product_id}`, "max");
      }
      revalidateTag("products:list", "max");
    } catch (cacheError) {
      log({
        level: "warn",
        layer: "job",
        message: "cache_revalidation_failed",
        requestId,
        orderId,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
    }

    try {
      let email = sessionEmail;
      if (!email && order.user_id) {
        const profile = await this.profilesRepo.getByUserId(order.user_id);
        email = profile?.email ?? null;
      }

      const detailedItems = await this.ordersRepo.getOrderItemsDetailed(orderId);
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

      if (email) {
        await this.orderEmailService.sendOrderConfirmation({
          to: email,
          orderId: order.id,
          createdAt: order.created_at ?? new Date().toISOString(),
          fulfillment,
          currency: order.currency ?? "USD",
          subtotal: Number(order.subtotal ?? 0),
          shipping: Number(order.shipping ?? 0),
          total: Number(order.total ?? 0),
          items,
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
      }
    } catch (emailError) {
      log({
        level: "warn",
        layer: "job",
        message: "stripe_order_email_failed",
        requestId,
        stripeEventId: eventId,
        orderId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    log({ level: "info", layer: "job", message: "stripe_order_completed", requestId, stripeEventId: eventId, orderId });
  }
}
