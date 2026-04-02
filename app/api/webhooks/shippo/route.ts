// app/api/webhooks/shippo/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { OrderEmailService } from "@/services/order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { extractShippoTrackingUpdate } from "@/lib/shippo/webhook";
import { log, logError } from "@/lib/utils/log";
import { SHIPPO_TRACKING_STATUS_MAP } from "@/config/constants/shipping";
import {
  shippoWebhookEventSchema,
  shippoWebhookQuerySchema,
} from "@/lib/validation/webhooks";

type EmailTrigger = "in_transit" | "delivered" | null;

const getEmailTrigger = (
  currentStatus: string | null,
  newStatus: string,
): EmailTrigger => {
  if (currentStatus === newStatus) {
    return null;
  }

  if (newStatus === "shipped" && currentStatus !== "shipped") {
    return "in_transit";
  }
  if (newStatus === "delivered" && currentStatus !== "delivered") {
    return "delivered";
  }

  return null;
};

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);

  try {
    // Verify webhook token
    const url = new URL(req.url);
    const queryParsed = shippoWebhookQuerySchema.safeParse({
      token: url.searchParams.get("token") ?? undefined,
    });

    if (!queryParsed.success) {
      log({
        level: "warn",
        layer: "api",
        message: "shippo_webhook_invalid_token",
        requestId,
        route: "/api/webhooks/shippo",
        status: 401,
        tokenPresent: false,
      });
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }

    const { token } = queryParsed.data;

    if (env.SHIPPO_WEBHOOK_TOKEN) {
      if (!token || token !== env.SHIPPO_WEBHOOK_TOKEN) {
        log({
          level: "warn",
          layer: "api",
          message: "shippo_webhook_invalid_token",
          requestId,
          route: "/api/webhooks/shippo",
          status: 401,
          tokenPresent: Boolean(token),
        });
        return NextResponse.json({ error: "invalid token" }, { status: 401 });
      }
    }

    const payload = await req.json().catch(() => null);
    const parsedEvent = shippoWebhookEventSchema.safeParse(payload);
    if (!parsedEvent.success) {
      logError(new Error("Webhook received invalid JSON"), {
        layer: "api",
        requestId,
        route: "/api/webhooks/shippo",
      });
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const eventType = parsedEvent.data.event;
    const shippoApiVersion = req.headers.get("Shippo-API-Version");

    // Only handle tracking-related Shippo webhooks.
    if (eventType === "transaction_created") {
      log({
        level: "info",
        layer: "api",
        message: "shippo_webhook_transaction_created_ignored",
        requestId,
        route: "/api/webhooks/shippo",
        shippoApiVersion,
        eventType,
        note: "label_created_notifications_are_sent_during_admin_label_purchase",
      });
      return NextResponse.json({ ok: true });
    }

    if (eventType !== "track_updated" && eventType !== "transaction_updated") {
      log({
        level: "info",
        layer: "api",
        message: "shippo_webhook_event_ignored",
        requestId,
        route: "/api/webhooks/shippo",
        shippoApiVersion,
        eventType,
      });
      return NextResponse.json({ ok: true });
    }

    const trackingUpdate = extractShippoTrackingUpdate(parsedEvent.data);
    if (!trackingUpdate) {
      log({
        level: "info",
        layer: "api",
        message: "shippo_webhook_missing_tracking_data",
        requestId,
        route: "/api/webhooks/shippo",
        shippoApiVersion,
        eventType,
        payloadKeys:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? Object.keys(payload as Record<string, unknown>)
            : [],
      });
      return NextResponse.json({ ok: true });
    }

    const { trackingNumber, statusRaw } = trackingUpdate;

    const status = String(statusRaw).toUpperCase();
    const newFulfillmentStatus = SHIPPO_TRACKING_STATUS_MAP[status];

    // Ignore statuses we don't track
    if (newFulfillmentStatus === null || newFulfillmentStatus === undefined) {
      log({
        level: "info",
        layer: "api",
        message: "shippo_webhook_status_ignored",
        requestId,
        route: "/api/webhooks/shippo",
        shippoApiVersion,
        eventType,
        trackingNumber,
        trackingStatus: status,
      });
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
      log({
        level: "info",
        layer: "api",
        message: "shippo_webhook_order_not_found",
        requestId,
        route: "/api/webhooks/shippo",
        shippoApiVersion,
        eventType,
        trackingNumber,
        trackingStatus: status,
      });
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
      const fulfillmentEventType =
        newFulfillmentStatus === "delivered" ? "delivered" : "shipped";
      try {
        const hasEvent = await orderEventsRepo.hasEvent(order.id, fulfillmentEventType);
        if (!hasEvent) {
          await orderEventsRepo.insertEvent({
            orderId: order.id,
            type: fulfillmentEventType,
            message:
              fulfillmentEventType === "delivered"
                ? "Order delivered."
                : "Order is in transit with the carrier.",
          });
        }
      } catch (eventError) {
        logError(eventError, {
          layer: "api",
          requestId,
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
        const profile = order.user_id
          ? await profilesRepo.getByUserId(order.user_id)
          : null;
        const email = profile?.email ?? order.guest_email ?? null;
        if (!email) {
          return NextResponse.json({ ok: true });
        }

        const emailService = new OrderEmailService();

        const carrier = order.shipping_carrier ?? trackingUpdate.carrier;
        const trackingUrl = trackingUpdate.trackingUrl;

        let orderUrl: string | null = null;
        if (!order.user_id && order.guest_email) {
          const { token: orderToken } = await accessTokenService.createToken({
            orderId: order.id,
          });
          orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${order.id}?token=${encodeURIComponent(orderToken)}`;
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
          requestId,
          route: "/api/webhooks/shippo",
          message: "Failed to send tracking status email",
          orderId: order.id,
        });
      }
    }

    log({
      level: "info",
      layer: "api",
      message: "shippo_webhook_processed",
      requestId,
      route: "/api/webhooks/shippo",
      shippoApiVersion,
      eventType,
      orderId: order.id,
      trackingNumber,
      trackingStatus: status,
      fulfillmentStatus: newFulfillmentStatus,
      emailTrigger,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    logError(e, { layer: "api", requestId, route: "/api/webhooks/shippo" });
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}
