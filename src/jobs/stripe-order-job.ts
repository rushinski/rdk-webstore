import Stripe from "stripe";
import { revalidateTag } from "next/cache";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import { StripeEventsRepository } from "@/repositories/stripe-events-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
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

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.eventsRepo = new StripeEventsRepository(supabase);
    this.addressesRepo = new AddressesRepository(supabase);
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

    // Save shipping snapshot (ship orders only)
    if (order.fulfillment === "ship") {
      const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
        // expand only expandable refs if you need them
        expand: ["customer", "payment_intent"],
      });

      const fullSession = unwrapStripe<Stripe.Checkout.Session>(retrieved);

      // ✅ Stripe wants you using collected_information.shipping_details (new)
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

    log({ level: "info", layer: "job", message: "stripe_order_completed", requestId, stripeEventId: eventId, orderId });
  }
}
