// app/api/webhooks/shippo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEmailService } from "@/services/order-email-service";
import { logError } from "@/lib/log";

// Map Shippo tracking statuses -> your fulfillment statuses
// Shippo webhook payload uses `data.tracking_status.status` like "DELIVERED". :contentReference[oaicite:12]{index=12}
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
    // Shippo recommends webhook security via shared secret in a URL query parameter. :contentReference[oaicite:13]{index=13}
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (env.SHIPPO_WEBHOOK_TOKEN) {
      if (!token || token !== env.SHIPPO_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: "invalid token" }, { status: 401 });
      }
    }

    const event = await req.json().catch(() => null);
    if (!event) return NextResponse.json({ ok: false }, { status: 400 });

    // Only handle tracking updates
    if (event.event !== "track_updated") {
      return NextResponse.json({ ok: true });
    }

    const data = event.data ?? {};
    const trackingNumber: string | undefined = data.tracking_number;
    const statusRaw: string | undefined = data.tracking_status?.status;

    if (!trackingNumber || !statusRaw) {
      return NextResponse.json({ ok: true });
    }

    const status = String(statusRaw).toUpperCase();
    const newFulfillmentStatus = TRACKING_STATUS_MAP[status];

    if (newFulfillmentStatus === null || newFulfillmentStatus === undefined) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createSupabaseServerClient();
    const ordersRepo = new OrdersRepository(supabase);
    const profilesRepo = new ProfileRepository(supabase);

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("tracking_number", trackingNumber)
      .limit(1);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const order = orders[0];
    const currentFulfillmentStatus = order.fulfillment_status;

    if (currentFulfillmentStatus !== newFulfillmentStatus) {
      await ordersRepo.setFulfillmentStatus(order.id, newFulfillmentStatus);
    }

    const emailTrigger = getEmailTrigger(currentFulfillmentStatus, newFulfillmentStatus);

    if (emailTrigger && order.user_id) {
      try {
        const profile = await profilesRepo.getByUserId(order.user_id);
        if (profile?.email) {
          const emailService = new OrderEmailService();

          const carrier = order.shipping_carrier ?? data.carrier ?? null;
          const trackingUrl = null; // Shippo track_updated payload doesn't always include a provider URL :contentReference[oaicite:14]{index=14}

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

    // Shippo expects a fast 2xx response and retries on certain failures. :contentReference[oaicite:15]{index=15}
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    logError(e, { layer: "api", route: "/api/webhooks/shippo" });
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}
