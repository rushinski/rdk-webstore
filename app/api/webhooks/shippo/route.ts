// app/api/webhooks/shippo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEmailService } from "@/services/order-email-service";
import { logError } from "@/lib/log";

// Map Shippo tracking statuses to fulfillment statuses
const TRACKING_STATUS_MAP: Record<string, string | null> = {
  PRE_TRANSIT: null,
  UNKNOWN: null,

  TRANSIT: "shipped",
  IN_TRANSIT: "shipped",
  OUT_FOR_DELIVERY: "shipped",
  AVAILABLE_FOR_PICKUP: "shipped",

  DELIVERED: "delivered",

  RETURNED: null,
  FAILURE: null,
  CANCELLED: null,
  ERROR: null,
};

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
    const token = url.searchParams.get("token");

    if (env.SHIPPO_WEBHOOK_TOKEN) {
      if (!token || token !== env.SHIPPO_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: "invalid token" }, { status: 401 });
      }
    }

    const event = await req.json().catch(() => null);
    if (!event) {
      logError(new Error("Webhook received invalid JSON"), {
        layer: "api",
        route: "/api/webhooks/shippo",
      });
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Only handle tracking updates
    if (event.event !== "track_updated") {
      return NextResponse.json({ ok: true });
    }

    const data = event.data ?? {};
    
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
        eventType: event.event,
      });
      return NextResponse.json({ ok: true });
    }

    const status = String(statusRaw).toUpperCase();
    const newFulfillmentStatus = TRACKING_STATUS_MAP[status];

    // Ignore statuses we don't track
    if (newFulfillmentStatus === null || newFulfillmentStatus === undefined) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createSupabaseServerClient();
    const ordersRepo = new OrdersRepository(supabase);
    const profilesRepo = new ProfileRepository(supabase);

    // Find order by tracking number
    const { data: orders } = await supabase
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

    // Send appropriate email
    const emailTrigger = getEmailTrigger(currentFulfillmentStatus, newFulfillmentStatus);

    if (emailTrigger && order.user_id) {
      try {
        const profile = await profilesRepo.getByUserId(order.user_id);
        if (profile?.email) {
          const emailService = new OrderEmailService();

          const carrier = order.shipping_carrier ?? data.carrier ?? null;
          const trackingUrl = 
            data.tracking_url_provider ?? 
            data.trackingUrlProvider ?? 
            null;

          if (emailTrigger === "in_transit") {
            await emailService.sendOrderInTransit({
              to: profile.email,
              orderId: order.id,
              carrier,
              trackingNumber,
              trackingUrl,
            });
          } else if (emailTrigger === "delivered") {
            await emailService.sendOrderDelivered({
              to: profile.email,
              orderId: order.id,
              carrier,
              trackingNumber,
              trackingUrl,
            });
          }
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