// app/api/admin/shipping/labels/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippoService } from "@/services/shipping-label-service";
import { OrderEmailService } from "@/services/order-email-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const labelsSchema = z
  .object({
    orderId: z.string().uuid(),
    shipmentId: z.string(), // kept for backwards compatibility
    rateId: z.string(),
  })
  .strict();

const isAlreadyLabeledOrPast = (order: any) => {
  const status = String(order?.fulfillment_status ?? "").toLowerCase();

  if (order?.tracking_number) return true;
  if (["ready_to_ship", "shipped", "delivered"].includes(status)) return true;

  return false;
};

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const body = await request.json().catch(() => null);
    const parsed = labelsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const { orderId, rateId } = parsed.data;

    const ordersRepo = new OrdersRepository(supabase);
    const profilesRepo = new ProfileRepository(supabase);
    const shippoService = new ShippoService();

    const order = await ordersRepo.getById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found", requestId }, { status: 404 });
    }

    if (isAlreadyLabeledOrPast(order)) {
      return NextResponse.json(
        {
          error: "Label already purchased for this order.",
          requestId,
          carrier: order.shipping_carrier ?? null,
          trackingNumber: order.tracking_number ?? null,
        },
        { status: 409 }
      );
    }

    // Purchase label via Shippo
    const transaction = await shippoService.purchaseLabel(rateId);

    if (transaction.status !== "SUCCESS") {
      const errorText = transaction.messages?.[0]?.text ?? "Transaction not successful";
      throw new Error(`Shippo label purchase failed: ${errorText}`);
    }

    const carrier = transaction.carrier;
    const trackingNumber = transaction.trackingNumber;
    const trackingUrl = transaction.trackingUrl;

    if (!trackingNumber) {
      throw new Error("Shippo label purchase succeeded but returned no tracking number");
    }

    // Update order
    await ordersRepo.markReadyToShip(orderId, {
      carrier,
      trackingNumber,
    });

    // Send email (best effort)
    try {
      if (order.user_id) {
        const profile = await profilesRepo.getByUserId(order.user_id);
        if (profile?.email) {
          const emailService = new OrderEmailService();
          await emailService.sendOrderLabelCreated({
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
        requestId,
        message: "Failed to send label created email",
      });
    }

    const labelUrl = transaction.labelUrl;

    return NextResponse.json({
      label: {
        label_url: labelUrl,
        pdf_url: labelUrl,
      },
      trackingCode: trackingNumber,
      trackingUrl: trackingUrl,
    });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/shipping/labels" });
    return NextResponse.json(
      { error: error.message || "Failed to create shipping label.", requestId },
      { status: 500 }
    );
  }
}