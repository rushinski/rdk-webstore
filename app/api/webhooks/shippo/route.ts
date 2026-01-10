// app/api/webhooks/shippo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { OrderEmailService } from "@/services/order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { logError } from "@/lib/log";
import { SHIPPO_TRACKING_STATUS_MAP } from "@/config/constants/shipping";
import {
  shippoTrackingUpdateSchema,
  shippoWebhookEventSchema,
  shippoWebhookQuerySchema,
} from "@/lib/validation/webhooks";

type EmailTrigger = "in_transit" | "delivered" | null;

const getEmailTrigger = (currentStatus: string | null, newStatus: string): EmailTrigger => {
  if (currentStatus === newStatus) return null;

  if (newStatus === "shipped" && currentStatus !== "shipped") return "in_transit";
  if (newStatus === "delivered" && currentStatus !== "delivered") return "delivered";

  return null;
};

export async function POST(req: NextRequest) {
  try {
    // Verify webhook token
    const url = new URL(req.url);
    const queryParsed = shippoWebhookQuerySchema.safeParse({
      token: url.searchParams.get("token") ?? undefined,
    });

    if (!queryParsed.success) {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }

    const { token } = queryParsed.data;

    if (env.SHIPPO_WEBHOOK_TOKEN) {
      if (!token || token !== env.SHIPPO_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: "invalid token" }, { status: 401 });
      }
    }

    const payload = await req.json().catch(() => null);
    const parsedEvent = shippoWebhookEventSchema.safeParse(payload);
    if (!parsedEvent.success) {
      logError(new Error("Webhook received invalid JSON"), {
        layer: "api",
        route: "/api/webhooks/shippo",
      });
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Only handle tracking updates
    if (parsedEvent.data.event !== "track_updated") {
      return NextResponse.json({ ok: true });
    }

    const trackingEvent = shippoTrackingUpdateSchema.safeParse(parsedEvent.data);
    if (!trackingEvent.success) {
      logError(new Error("Shippo webhook missing tracking data"), {
        layer: "api",
        route: "/api/webhooks/shippo",
        eventType: parsedEvent.data.event,
      });
      return NextResponse.json({ ok: true });
    }

    const data = trackingEvent.data.data ?? {};
    
    // Shippo webhook sends tracking_number and tracking_status
    const trackingNumber: string | undefined = 
      data.tracking_number ?? data.trackingNumber;
    
    const trackingStatus = data.tracking_status ?? data.trackingStatus;
    const statusRaw: string | undefined = trackingStatus?.status;

    if (!trackingNumber || !statusRaw) {
      logError(new Error("Shippo webhook missing tracking data"), {
        layer: "api",
        route: "/api/webhooks/shippo",
        hasTrackingNumber: !!trackingNumber,
        hasStatus: !!statusRaw,
        eventType: parsedEvent.data.event,
      });
      return NextResponse.json({ ok: true });
    }

    const status = String(statusRaw).toUpperCase();
    const newFulfillmentStatus = SHIPPO_TRACKING_STATUS_MAP[status];

    // Ignore statuses we don't track
    if (newFulfillmentStatus === null || newFulfillmentStatus === undefined) {
      return NextResponse.json({ ok: true });
    }

    const adminSupabase = createSupabaseAdminClient();
    const ordersRepo = new OrdersRepository(adminSupabase);
    const profilesRepo = new ProfileRepository(adminSupabase);
    const orderEventsRepo = new OrderEventsRepository(adminSupabase);
    const accessTokenService = new OrderAccessTokenService(adminSupabase);

    // Find order by tracking number
    const { data: orders } = await adminSupabase
      .from("orders")
      .select("*")
      .eq("tracking_number", trackingNumber)
      .limit(1);

    if (!orders || orders.length === 0) {
      // Not an error - webhook might arrive before order is in our system
      return NextResponse.json({ ok: true });
    }

    const order = orders[0];
    const currentFulfillmentStatus = order.fulfillment_status;

    // Update status if changed
    if (currentFulfillmentStatus !== newFulfillmentStatus) {
      await ordersRepo.setFulfillmentStatus(order.id, newFulfillmentStatus);
    }

    // Create fulfillment events
    if (currentFulfillmentStatus !== newFulfillmentStatus) {
      const eventType = newFulfillmentStatus === "delivered" ? "delivered" : "shipped";
      try {
        const hasEvent = await orderEventsRepo.hasEvent(order.id, eventType);
        if (!hasEvent) {
          await orderEventsRepo.insertEvent({
            orderId: order.id,
            type: eventType,
            message:
              eventType === "delivered"
                ? "Order delivered."
                : "Order is in transit with the carrier.",
          });
        }
      } catch (eventError) {
        logError(eventError, {
          layer: "api",
          route: "/api/webhooks/shippo",
          message: "Failed to create order event",
          orderId: order.id,
        });
      }
    }

    // Send appropriate email
    const emailTrigger = getEmailTrigger(currentFulfillmentStatus, newFulfillmentStatus);

    if (emailTrigger && (order.user_id || order.guest_email)) {
      try {
        const profile = order.user_id ? await profilesRepo.getByUserId(order.user_id) : null;
        const email = profile?.email ?? order.guest_email ?? null;
        if (!email) return NextResponse.json({ ok: true });

        const emailService = new OrderEmailService();

        const carrier = order.shipping_carrier ?? data.carrier ?? null;
        const trackingUrl =
          data.tracking_url_provider ??
          data.trackingUrlProvider ??
          null;

        let orderUrl: string | null = null;
        if (!order.user_id && order.guest_email) {
          const { token } = await accessTokenService.createToken({ orderId: order.id });
          orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${order.id}?token=${encodeURIComponent(token)}`;
        }

        if (emailTrigger === "in_transit") {
          await emailService.sendOrderInTransit({
            to: email,
            orderId: order.id,
            carrier,
            trackingNumber,
            trackingUrl,
            orderUrl,
          });
        } else if (emailTrigger === "delivered") {
          await emailService.sendOrderDelivered({
            to: email,
            orderId: order.id,
            carrier,
            trackingNumber,
            trackingUrl,
            orderUrl,
          });
        }
      } catch (emailError) {
        logError(emailError, {
          layer: "api",
          route: "/api/webhooks/shippo",
          message: "Failed to send tracking status email",
          orderId: order.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    logError(e, { layer: "api", route: "/api/webhooks/shippo" });
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}
