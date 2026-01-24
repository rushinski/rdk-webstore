// app/api/admin/shipping/labels/route.ts
// Enhanced version with audit tracking and cost recording

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
    shipmentId: z.string(),
    rateId: z.string(),
  })
  .strict();

type OrderSummary = {
  fulfillment_status?: string | null;
  tracking_number?: string | null;
};

type ReadyToShipInput = Parameters<OrdersRepository["markReadyToShip"]>[1];

const isAlreadyLabeledOrPast = (order: OrderSummary) => {
  const status = String(order?.fulfillment_status ?? "").toLowerCase();
  if (order?.tracking_number) {
    return true;
  }
  if (["ready_to_ship", "shipped", "delivered"].includes(status)) {
    return true;
  }
  return false;
};

const mapShippoError = (error: string): string => {
  const lower = error.toLowerCase();

  if (lower.includes("address") && lower.includes("invalid")) {
    return "The shipping address is invalid. Please verify the address details.";
  }
  if (lower.includes("insufficient funds")) {
    return "Insufficient funds in your Shippo account. Please add funds to continue.";
  }
  if (lower.includes("rate") && lower.includes("expired")) {
    return "The shipping rate has expired. Please get new rates and try again.";
  }
  if (lower.includes("carrier")) {
    return "Carrier service unavailable. Please try a different carrier or try again later.";
  }

  return error;
};

// Convert dollar string to cents
const dollarsToCents = (dollars: string | null | undefined): number => {
  if (!dollars) {
    return 0;
  }
  const num = parseFloat(dollars);
  return Math.round(num * 100);
};

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const adminUserId = session.profile?.id ?? null;

    const body = await request.json().catch(() => null);
    const parsed = labelsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 },
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
          error: "A shipping label has already been purchased for this order.",
          requestId,
          carrier: order.shipping_carrier ?? null,
          trackingNumber: order.tracking_number ?? null,
        },
        { status: 409 },
      );
    }

    // Purchase label via Shippo
    let transaction;
    try {
      transaction = await shippoService.purchaseLabel(rateId);
    } catch (shippoError: unknown) {
      const message =
        shippoError instanceof Error ? shippoError.message : "Label purchase failed";
      const mappedError = mapShippoError(message);

      // Log for monitoring
      logError(shippoError, {
        layer: "api",
        requestId,
        orderId,
        rateId,
        message: "Shippo label purchase failed",
      });

      return NextResponse.json({ error: mappedError, requestId }, { status: 502 });
    }

    if (transaction.status !== "SUCCESS") {
      const errorText = transaction.messages?.[0]?.text ?? "Transaction not successful";
      const mappedError = mapShippoError(errorText);

      logError(new Error(`Shippo transaction failed: ${errorText}`), {
        layer: "api",
        requestId,
        orderId,
        transactionStatus: transaction.status,
      });

      return NextResponse.json(
        { error: `Label purchase failed: ${mappedError}`, requestId },
        { status: 502 },
      );
    }

    const carrier = transaction.carrier;
    const trackingNumber = transaction.trackingNumber;
    const trackingUrl = transaction.trackingUrl;
    const labelUrl = transaction.labelUrl;
    const shippingCostCents = dollarsToCents(transaction.rate);

    if (!trackingNumber) {
      return NextResponse.json(
        {
          error:
            "Label purchase succeeded but returned no tracking number. Please contact support.",
          requestId,
        },
        { status: 502 },
      );
    }

    // Update order with full audit trail
    const updateData: ReadyToShipInput = {
      carrier,
      trackingNumber,
      labelUrl,
      labelCreatedBy: adminUserId,
      actualShippingCost: shippingCostCents,
    };

    await ordersRepo.markReadyToShip(orderId, updateData);

    // Send customer notification email
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
      // Don't fail the request if email fails
      logError(emailError, {
        layer: "api",
        requestId,
        message: "Failed to send label created email (non-blocking)",
        orderId,
      });
    }

    // Log successful label creation
    logError(new Error("Label created successfully"), {
      layer: "api",
      requestId,
      orderId,
      carrier,
      trackingNumber,
      cost: shippingCostCents,
      createdBy: adminUserId,
      level: "info",
    });

    return NextResponse.json({
      success: true,
      label: {
        label_url: labelUrl,
        pdf_url: labelUrl,
      },
      trackingCode: trackingNumber,
      trackingUrl: trackingUrl,
      carrier: carrier,
      cost: shippingCostCents,
      message: "Label purchased successfully. Customer has been notified via email.",
    });
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/shipping/labels",
      message: "Unexpected error during label creation",
    });

    const userMessage = mapShippoError(
      error instanceof Error ? error.message : "Failed to create shipping label.",
    );

    return NextResponse.json({ error: userMessage, requestId }, { status: 500 });
  }
}
