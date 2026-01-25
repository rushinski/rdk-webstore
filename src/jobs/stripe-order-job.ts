// src/jobs/stripe-order-job.ts
import Stripe from "stripe";
import { revalidateTag } from "next/cache";

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { StripeEventsRepository } from "@/repositories/stripe-events-repo";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { ProductService } from "@/services/product-service";
import { OrderEmailService } from "@/services/order-email-service";
import { ChatService } from "@/services/chat-service";
import { AdminNotificationService } from "@/services/admin-notification-service";
import { AdminOrderEmailService } from "@/services/admin-order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { log } from "@/lib/utils/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// Helper: some Stripe SDK typings show retrieve() as Response<Session>
function unwrapStripe<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value) {
    const maybe = value as { data?: unknown };
    return maybe.data as T;
  }
  return value as T;
}

// Helper: normalize tax from order record (supports a few common column names)
function getOrderTax(
  order:
    | {
        tax?: unknown;
        tax_total?: unknown;
        tax_amount?: unknown;
      }
    | null
    | undefined,
): number {
  const raw = order?.tax ?? order?.tax_total ?? order?.tax_amount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// Stripe typings can differ by API version; support a legacy field safely.
type ShippingDetailsLike = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

type LegacyShippingDetails = {
  shipping_details?: ShippingDetailsLike | null;
};

// Some versions include phone on shipping; read it safely.
type ShippingWithPhone = Stripe.PaymentIntent.Shipping & { phone?: string | null };

// Minimal shape used from getOrderItemsDetailed()
type DetailedOrderItemLike = {
  unit_price?: unknown;
  line_total?: unknown;
  quantity?: unknown;
  product?: {
    title_display?: string | null;
    brand?: string | null;
    name?: string | null;
  } | null;
  variant?: {
    size_label?: string | null;
  } | null;
  product_id?: string;
};

export class StripeOrderJob {
  private ordersRepo: OrdersRepository;
  private eventsRepo: StripeEventsRepository;
  private addressesRepo: AddressesRepository;
  private profilesRepo: ProfileRepository;
  private orderEventsRepo: OrderEventsRepository;
  private productService: ProductService;
  private orderEmailService: OrderEmailService;
  private orderAccessTokens: OrderAccessTokenService | null;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    private readonly adminSupabase?: AdminSupabaseClient,
  ) {
    const primarySupabase = adminSupabase ?? supabase;
    this.ordersRepo = new OrdersRepository(primarySupabase);
    this.eventsRepo = new StripeEventsRepository(primarySupabase);
    this.addressesRepo = new AddressesRepository(primarySupabase);
    this.profilesRepo = new ProfileRepository(primarySupabase);
    this.orderEventsRepo = new OrderEventsRepository(primarySupabase);
    this.productService = new ProductService(primarySupabase);
    this.orderEmailService = new OrderEmailService();
    this.orderAccessTokens = adminSupabase
      ? new OrderAccessTokenService(adminSupabase)
      : null;
  }

  private async sendAdminOrderEmails(params: {
    order: {
      id: string;
      fulfillment?: string | null;
      subtotal?: number | null;
      shipping?: number | null;
      total?: number | null;
      tax?: number | null;
      tax_total?: number | null;
      tax_amount?: number | null;
      guest_email?: string | null;
      user_id?: string | null;
    };
    orderItems: Array<{ quantity?: number | null }>;
    customerEmail?: string | null;
  }) {
    if (!this.adminSupabase) {
      return;
    }

    const staff = await this.profilesRepo.listStaffProfiles();
    const recipients = staff.filter(
      (admin) => admin.admin_order_notifications_enabled !== false && admin.email,
    );
    if (recipients.length === 0) {
      return;
    }

    const itemCount = params.orderItems.reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0,
    );
    const fulfillment: "ship" | "pickup" =
      params.order.fulfillment === "pickup" ? "pickup" : "ship";
    const subtotal = Number(params.order.subtotal ?? 0);
    const shipping = Number(params.order.shipping ?? 0);
    const tax = getOrderTax(params.order);
    const total = Number(params.order.total ?? 0);

    const emailService = new AdminOrderEmailService();
    const basePayload = {
      orderId: params.order.id,
      fulfillment,
      subtotal,
      tax,
      shipping,
      total,
      itemCount,
      customerEmail: params.customerEmail ?? params.order.guest_email ?? null,
    };

    await Promise.all(
      recipients.map((admin) =>
        emailService.sendOrderPlaced({
          ...basePayload,
          to: admin.email ?? "",
        }),
      ),
    );
  }

  async processCheckoutSessionCompleted(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const eventId = event.id;

    const alreadyProcessed = await this.eventsRepo.hasProcessed(eventId);
    if (alreadyProcessed) {
      log({
        level: "info",
        layer: "job",
        message: "stripe_event_already_processed",
        requestId,
        stripeEventId: eventId,
      });
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      log({
        level: "warn",
        layer: "job",
        message: "stripe_event_missing_order_id",
        requestId,
        stripeEventId: eventId,
      });
      await this.eventsRepo.recordProcessed(
        eventId,
        event.type,
        event.created,
        event.data.object,
      );
      return;
    }

    const order = await this.ordersRepo.getById(orderId);
    if (!order) {
      log({
        level: "error",
        layer: "job",
        message: "stripe_event_order_not_found",
        requestId,
        stripeEventId: eventId,
        orderId,
      });
      await this.eventsRepo.recordProcessed(
        eventId,
        event.type,
        event.created,
        event.data.object,
        orderId,
      );
      return;
    }

    const orderItems = await this.ordersRepo.getOrderItems(orderId);
    const itemsToDecrement = orderItems.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    }));

    const paymentIntentId = session.payment_intent as string;
    const didMarkPaid = await this.ordersRepo.markPaidTransactionally(
      orderId,
      paymentIntentId,
      itemsToDecrement,
    );
    if (!didMarkPaid) {
      log({
        level: "info",
        layer: "job",
        message: "stripe_event_order_already_paid",
        requestId,
        stripeEventId: eventId,
        orderId,
      });
    }

    const productIds = [...new Set(orderItems.map((item) => item.product_id))];
    for (const productId of productIds) {
      await this.productService.syncSizeTags(productId);
    }

    try {
      const hasPaidEvent = await this.orderEventsRepo.hasEvent(orderId, "paid");
      if (!hasPaidEvent) {
        await this.orderEventsRepo.insertEvent({
          orderId,
          type: "paid",
          message: "Payment confirmed.",
        });
      }
    } catch (eventError) {
      log({
        level: "warn",
        layer: "job",
        message: "order_event_create_failed",
        requestId,
        orderId,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    let sessionEmail = session.customer_details?.email ?? session.customer_email ?? null;
    let shippingSnapshot = null as Awaited<
      ReturnType<AddressesRepository["getOrderShipping"]>
    > | null;
    const fulfillment = order.fulfillment === "pickup" ? "pickup" : "ship";

    const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["customer", "payment_intent"],
    });

    const fullSession = unwrapStripe<Stripe.Checkout.Session>(retrieved);
    sessionEmail = fullSession.customer_details?.email ?? sessionEmail;

    if (this.adminSupabase && order.fulfillment === "pickup" && order.user_id) {
      try {
        const chatService = new ChatService(this.adminSupabase, this.adminSupabase);
        await chatService.createChatForUser({
          userId: order.user_id,
          orderId: order.id,
        });
      } catch (chatError) {
        log({
          level: "warn",
          layer: "job",
          message: "pickup_chat_create_failed",
          requestId,
          orderId,
          error: chatError instanceof Error ? chatError.message : String(chatError),
        });
      }
    }

    // Save shipping snapshot (ship orders only)
    if (fulfillment === "ship") {
      const legacyShippingDetails =
        (fullSession as LegacyShippingDetails).shipping_details ?? null;

      // Stripe wants you using collected_information.shipping_details (new)
      const shippingDetails =
        fullSession.collected_information?.shipping_details ??
        legacyShippingDetails ??
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

        // Set initial fulfillment status for the admin shipping queue
        await this.ordersRepo.setFulfillmentStatus(orderId, "unfulfilled");
      }
    }

    if (fulfillment === "ship") {
      shippingSnapshot = await this.addressesRepo.getOrderShipping(orderId);
    }

    await this.eventsRepo.recordProcessed(
      eventId,
      event.type,
      event.created,
      event.data.object,
      orderId,
    );

    if (this.adminSupabase) {
      try {
        const notifications = new AdminNotificationService(this.adminSupabase);
        await notifications.notifyOrderPlaced(orderId);
      } catch (notifyError) {
        log({
          level: "warn",
          layer: "job",
          message: "order_admin_notification_failed",
          requestId,
          orderId,
          error: notifyError instanceof Error ? notifyError.message : String(notifyError),
        });
      }

      try {
        const hasAdminEmailEvent = await this.orderEventsRepo.hasEvent(
          orderId,
          "admin_order_email_sent",
        );
        if (!hasAdminEmailEvent) {
          let customerEmail = sessionEmail ?? null;
          if (!customerEmail && order.user_id) {
            const profile = await this.profilesRepo.getByUserId(order.user_id);
            customerEmail = profile?.email ?? null;
          }
          if (!customerEmail) {
            customerEmail = order.guest_email ?? null;
          }

          await this.sendAdminOrderEmails({
            order,
            orderItems,
            customerEmail,
          });
          await this.orderEventsRepo.insertEvent({
            orderId,
            type: "admin_order_email_sent",
            message: "Admin order email sent.",
          });
        }
      } catch (emailError) {
        log({
          level: "warn",
          layer: "job",
          message: "order_admin_email_failed",
          requestId,
          orderId,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }

    // Next.js 16+ requires 2 args: revalidateTag(tag, profile).
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
      if (!email && !order.user_id) {
        email = order.guest_email ?? null;
      }

      if (!order.user_id && email && order.guest_email !== email) {
        await this.ordersRepo.updateGuestEmail(order.id, email);
      }

      let orderUrl: string | null = null;
      if (!order.user_id && email && this.orderAccessTokens) {
        const { token } = await this.orderAccessTokens.createToken({ orderId: order.id });
        orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${order.id}?token=${encodeURIComponent(
          token,
        )}`;
      }

      const detailedItems = await this.ordersRepo.getOrderItemsDetailed(orderId);
      const items = (detailedItems as DetailedOrderItemLike[]).map((item) => {
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
        const hasConfirmationEvent = await this.orderEventsRepo.hasEvent(
          order.id,
          "confirmation_email_sent",
        );
        const hasPickupEvent = await this.orderEventsRepo.hasEvent(
          order.id,
          "pickup_instructions_sent",
        );

        if (!hasConfirmationEvent) {
          const tax = getOrderTax(order);

          await this.orderEmailService.sendOrderConfirmation({
            to: email,
            orderId: order.id,
            createdAt: order.created_at ?? new Date().toISOString(),
            fulfillment,
            currency: order.currency ?? "USD",
            subtotal: Number(order.subtotal ?? 0),
            shipping: Number(order.shipping ?? 0),
            tax,
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
              : null,
          });

          try {
            await this.orderEventsRepo.insertEvent({
              orderId: order.id,
              type: "confirmation_email_sent",
              message: "Order confirmation emailed.",
            });
          } catch (eventError) {
            log({
              level: "warn",
              layer: "job",
              message: "order_event_create_failed",
              requestId,
              orderId: order.id,
              error:
                eventError instanceof Error ? eventError.message : String(eventError),
            });
          }
        }

        if (fulfillment === "pickup" && !hasPickupEvent) {
          await this.orderEmailService.sendPickupInstructions({
            to: email,
            orderId: order.id,
            orderUrl,
          });

          try {
            await this.orderEventsRepo.insertEvent({
              orderId: order.id,
              type: "pickup_instructions_sent",
              message: "Pickup instructions emailed.",
            });
          } catch (eventError) {
            log({
              level: "warn",
              layer: "job",
              message: "order_event_create_failed",
              requestId,
              orderId: order.id,
              error:
                eventError instanceof Error ? eventError.message : String(eventError),
            });
          }
        }
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

    log({
      level: "info",
      layer: "job",
      message: "stripe_order_completed",
      requestId,
      stripeEventId: eventId,
      orderId,
    });
  }

  async processPaymentIntentSucceeded(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const eventId = event.id;

    const alreadyProcessed = await this.eventsRepo.hasProcessed(eventId);
    if (alreadyProcessed) {
      log({
        level: "info",
        layer: "job",
        message: "stripe_event_already_processed",
        requestId,
        stripeEventId: eventId,
      });
      return;
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
      log({
        level: "warn",
        layer: "job",
        message: "stripe_event_missing_order_id",
        requestId,
        stripeEventId: eventId,
      });
      await this.eventsRepo.recordProcessed(
        eventId,
        event.type,
        event.created,
        event.data.object,
      );
      return;
    }

    const order = await this.ordersRepo.getById(orderId);
    if (!order) {
      log({
        level: "error",
        layer: "job",
        message: "stripe_event_order_not_found",
        requestId,
        stripeEventId: eventId,
        orderId,
      });
      await this.eventsRepo.recordProcessed(
        eventId,
        event.type,
        event.created,
        event.data.object,
        orderId,
      );
      return;
    }

    const orderItems = await this.ordersRepo.getOrderItems(orderId);
    const itemsToDecrement = orderItems.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    }));

    const didMarkPaid = await this.ordersRepo.markPaidTransactionally(
      orderId,
      paymentIntent.id,
      itemsToDecrement,
    );
    if (!didMarkPaid) {
      log({
        level: "info",
        layer: "job",
        message: "stripe_event_order_already_paid",
        requestId,
        stripeEventId: eventId,
        orderId,
      });
    }

    const productIds = [...new Set(orderItems.map((item) => item.product_id))];
    for (const productId of productIds) {
      await this.productService.syncSizeTags(productId);
    }

    try {
      const hasPaidEvent = await this.orderEventsRepo.hasEvent(orderId, "paid");
      if (!hasPaidEvent) {
        await this.orderEventsRepo.insertEvent({
          orderId,
          type: "paid",
          message: "Payment confirmed.",
        });
      }
    } catch (eventError) {
      log({
        level: "warn",
        layer: "job",
        message: "order_event_create_failed",
        requestId,
        orderId,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    const fulfillment = order.fulfillment === "pickup" ? "pickup" : "ship";
    let shippingSnapshot = null as Awaited<
      ReturnType<AddressesRepository["getOrderShipping"]>
    > | null;

    if (fulfillment === "ship") {
      const shipping = paymentIntent.shipping;
      const address = shipping?.address;
      if (address) {
        const addressInput = {
          name: shipping?.name ?? null,
          phone: (shipping as ShippingWithPhone | null | undefined)?.phone ?? null,
          line1: address.line1 ?? null,
          line2: address.line2 ?? null,
          city: address.city ?? null,
          state: address.state ?? null,
          postalCode: address.postal_code ?? null,
          country: address.country ?? null,
        };

        await this.addressesRepo.insertOrderShippingSnapshot(orderId, addressInput);

        if (order.user_id) {
          await this.addressesRepo.upsertUserAddress(order.user_id, addressInput);
        }

        await this.ordersRepo.setFulfillmentStatus(orderId, "unfulfilled");
      }

      shippingSnapshot = await this.addressesRepo.getOrderShipping(orderId);
    }

    if (this.adminSupabase && fulfillment === "pickup" && order.user_id) {
      try {
        const chatService = new ChatService(this.adminSupabase, this.adminSupabase);
        await chatService.createChatForUser({
          userId: order.user_id,
          orderId: order.id,
        });
      } catch (chatError) {
        log({
          level: "warn",
          layer: "job",
          message: "pickup_chat_create_failed",
          requestId,
          orderId,
          error: chatError instanceof Error ? chatError.message : String(chatError),
        });
      }
    }

    await this.eventsRepo.recordProcessed(
      eventId,
      event.type,
      event.created,
      event.data.object,
      orderId,
    );

    if (this.adminSupabase) {
      try {
        const notifications = new AdminNotificationService(this.adminSupabase);
        await notifications.notifyOrderPlaced(orderId);
      } catch (notifyError) {
        log({
          level: "warn",
          layer: "job",
          message: "order_admin_notification_failed",
          requestId,
          orderId,
          error: notifyError instanceof Error ? notifyError.message : String(notifyError),
        });
      }

      try {
        const hasAdminEmailEvent = await this.orderEventsRepo.hasEvent(
          orderId,
          "admin_order_email_sent",
        );
        if (!hasAdminEmailEvent) {
          let customerEmail: string | null = null;
          if (order.user_id) {
            const profile = await this.profilesRepo.getByUserId(order.user_id);
            customerEmail = profile?.email ?? null;
          }
          if (!customerEmail) {
            customerEmail = order.guest_email ?? null;
          }

          await this.sendAdminOrderEmails({
            order,
            orderItems,
            customerEmail,
          });
          await this.orderEventsRepo.insertEvent({
            orderId,
            type: "admin_order_email_sent",
            message: "Admin order email sent.",
          });
        }
      } catch (emailError) {
        log({
          level: "warn",
          layer: "job",
          message: "order_admin_email_failed",
          requestId,
          orderId,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }

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
      let email = paymentIntent.receipt_email ?? null;
      if (!email && order.user_id) {
        const profile = await this.profilesRepo.getByUserId(order.user_id);
        email = profile?.email ?? null;
      }
      if (!email && !order.user_id) {
        email = order.guest_email ?? null;
      }

      if (!order.user_id && email && order.guest_email !== email) {
        await this.ordersRepo.updateGuestEmail(order.id, email);
      }

      let orderUrl: string | null = null;
      if (!order.user_id && email && this.orderAccessTokens) {
        const { token } = await this.orderAccessTokens.createToken({ orderId: order.id });
        orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${order.id}?token=${encodeURIComponent(
          token,
        )}`;
      }

      const detailedItems = await this.ordersRepo.getOrderItemsDetailed(orderId);
      const items = (detailedItems as DetailedOrderItemLike[]).map((item) => {
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
        const hasConfirmationEvent = await this.orderEventsRepo.hasEvent(
          order.id,
          "confirmation_email_sent",
        );
        const hasPickupEvent = await this.orderEventsRepo.hasEvent(
          order.id,
          "pickup_instructions_sent",
        );

        if (!hasConfirmationEvent) {
          const tax = getOrderTax(order);

          await this.orderEmailService.sendOrderConfirmation({
            to: email,
            orderId: order.id,
            createdAt: order.created_at ?? new Date().toISOString(),
            fulfillment,
            currency: order.currency ?? "USD",
            subtotal: Number(order.subtotal ?? 0),
            shipping: Number(order.shipping ?? 0),
            tax,
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
              : null,
          });

          try {
            await this.orderEventsRepo.insertEvent({
              orderId: order.id,
              type: "confirmation_email_sent",
              message: "Order confirmation emailed.",
            });
          } catch (eventError) {
            log({
              level: "warn",
              layer: "job",
              message: "order_event_create_failed",
              requestId,
              orderId: order.id,
              error:
                eventError instanceof Error ? eventError.message : String(eventError),
            });
          }
        }

        if (fulfillment === "pickup" && !hasPickupEvent) {
          await this.orderEmailService.sendPickupInstructions({
            to: email,
            orderId: order.id,
            orderUrl,
          });

          try {
            await this.orderEventsRepo.insertEvent({
              orderId: order.id,
              type: "pickup_instructions_sent",
              message: "Pickup instructions emailed.",
            });
          } catch (eventError) {
            log({
              level: "warn",
              layer: "job",
              message: "order_event_create_failed",
              requestId,
              orderId: order.id,
              error:
                eventError instanceof Error ? eventError.message : String(eventError),
            });
          }
        }
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

    log({
      level: "info",
      layer: "job",
      message: "stripe_order_completed",
      requestId,
      stripeEventId: eventId,
      orderId,
    });
  }
}
