// app/api/webhooks/easypost/route.ts
import { NextRequest, NextResponse } from "next/server";
import EasyPostClient from "@easypost/api";
import { env } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEmailService } from "@/services/order-email-service";
import { logError } from "@/lib/log";

const client = new EasyPostClient(env.EASYPOST_API_KEY);

// Tracking status mappings to our fulfillment statuses
const TRACKING_STATUS_MAP: Record<string, string | null> = {
  // Pre-transit: label created but not picked up
  "pre_transit": null, // Don't update, already handled by label creation
  "unknown": null,
  
  // In transit: package is moving
  "in_transit": "shipped",
  "out_for_delivery": "shipped",
  
  // Delivered: final state
  "delivered": "delivered",
  
  // Issues
  "available_for_pickup": "shipped",
  "return_to_sender": null,
  "failure": null,
  "cancelled": null,
  "error": null,
};

// Email triggers based on status changes
type EmailTrigger = "in_transit" | "delivered" | null;

const getEmailTrigger = (
  currentStatus: string | null,
  newStatus: string,
  previousStatus: string | null
): EmailTrigger => {
  // Don't send emails if status hasn't meaningfully changed
  if (currentStatus === newStatus) return null;
  
  // Send "in transit" email when first entering shipped state
  if (newStatus === "shipped" && currentStatus !== "shipped") {
    return "in_transit";
  }
  
  // Send "delivered" email when entering delivered state
  if (newStatus === "delivered" && currentStatus !== "delivered") {
    return "delivered";
  }
  
  return null;
};

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    // Validate the webhook signature
    // EasyPost SDK provides validateWebhook method
    // Note: You need to configure webhook secret in EasyPost dashboard
    if (env.EASYPOST_WEBHOOK_SECRET) {
      try {
        // Uncomment when ready to use webhook validation
        // client.Webhook.validateWebhook(env.EASYPOST_WEBHOOK_SECRET, headers, bodyText);
      } catch (validationError) {
        logError(validationError, { 
          layer: "api", 
          route: "/api/webhooks/easypost",
          message: "Webhook validation failed"
        });
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(bodyText);
    
    // EasyPost sends various event types, we care about tracker updates
    if (event.description === "tracker.updated") {
      const tracker = event.result;
      const trackingCode = tracker?.tracking_code;
      const trackingStatus = tracker?.status?.toLowerCase();
      
      if (!trackingCode || !trackingStatus) {
        return NextResponse.json({ ok: true });
      }

      // Find order by tracking number
      const supabase = await createSupabaseServerClient();
      const ordersRepo = new OrdersRepository(supabase);
      const profilesRepo = new ProfileRepository(supabase);
      
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("tracking_number", trackingCode)
        .limit(1);

      if (!orders || orders.length === 0) {
        // No matching order found, could be a different system's tracking
        return NextResponse.json({ ok: true });
      }

      const order = orders[0];
      const currentFulfillmentStatus = order.fulfillment_status;
      const newFulfillmentStatus = TRACKING_STATUS_MAP[trackingStatus];
      
      // Skip if we don't map this status
      if (newFulfillmentStatus === null) {
        return NextResponse.json({ ok: true });
      }

      // Update order fulfillment status if it changed
      if (currentFulfillmentStatus !== newFulfillmentStatus) {
        await ordersRepo.setFulfillmentStatus(order.id, newFulfillmentStatus);
      }

      // Determine if we should send an email
      const emailTrigger = getEmailTrigger(
        currentFulfillmentStatus,
        newFulfillmentStatus,
        trackingStatus
      );

      if (emailTrigger && order.user_id) {
        try {
          const profile = await profilesRepo.getByUserId(order.user_id);
          if (profile?.email) {
            const emailService = new OrderEmailService();
            const carrier = order.shipping_carrier ?? tracker.carrier ?? null;
            const trackingUrl = tracker.public_url ?? null;

            if (emailTrigger === "in_transit") {
              await emailService.sendOrderInTransit({
                to: profile.email,
                orderId: order.id,
                carrier,
                trackingNumber: trackingCode,
                trackingUrl,
              });
            } else if (emailTrigger === "delivered") {
              await emailService.sendOrderDelivered({
                to: profile.email,
                orderId: order.id,
                carrier,
                trackingNumber: trackingCode,
                trackingUrl,
              });
            }
          }
        } catch (emailError) {
          logError(emailError, {
            layer: "api",
            route: "/api/webhooks/easypost",
            message: "Failed to send tracking status email",
            orderId: order.id,
          });
          // Don't fail the webhook processing if email fails
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    logError(e, { layer: "api", route: "/api/webhooks/easypost" });
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}