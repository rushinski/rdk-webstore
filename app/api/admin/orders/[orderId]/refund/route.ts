// app/api/admin/orders/[orderId]/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderEmailService } from "@/services/order-email-service";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

function toExpandedCharge(
  latestCharge: Stripe.PaymentIntent["latest_charge"]
): Stripe.Charge | null {
  if (!latestCharge) return null;
  if (typeof latestCharge === "string") return null;
  return latestCharge;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { orderId } = await params;

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const ordersRepo = new OrdersRepository(supabase);
    const profilesRepo = new ProfileRepository(supabase);

    const order = await ordersRepo.getOrderWithTenant(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (order.status === "refunded") {
      return NextResponse.json(
        { error: "Order has already been refunded", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "Cannot refund order: Missing payment information", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const tenantId = order.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Cannot refund: Tenant not found for order", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const stripeAccountId = await profilesRepo.getStripeAccountIdForTenant(tenantId);

    log({
      level: "info",
      layer: "api",
      message: "refund_initiated",
      orderId,
      tenantId,
      stripeAccountId: stripeAccountId ?? "not_configured",
      paymentIntentId: order.stripe_payment_intent_id,
    });

    // Retrieve payment intent with expanded charge and transfer data
    let paymentIntent: Stripe.PaymentIntent;
    let retrievedOnAccount: "platform" | "connect" = "platform";

    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id,
        { expand: ["latest_charge", "latest_charge.transfer"] }
      );
      retrievedOnAccount = "platform";
    } catch (platformError: any) {
      if (stripeAccountId) {
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(
            order.stripe_payment_intent_id,
            { expand: ["latest_charge", "latest_charge.transfer"] },
            { stripeAccount: stripeAccountId }
          );
          retrievedOnAccount = "connect";
        } catch (connectError: any) {
          logError(new Error("Payment intent not found on either account"), {
            layer: "api",
            requestId,
            orderId,
            platformError: platformError.message,
            connectError: connectError.message,
          });

          return NextResponse.json(
            {
              error: "Payment intent not found",
              requestId,
            },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
      } else {
        throw platformError;
      }
    }

    // Get charge (fallback to charges.list if not expanded)
    let charge: Stripe.Charge | null = toExpandedCharge(paymentIntent.latest_charge);

    if (!charge) {
      const chargesResp = await stripe.charges.list(
        {
          payment_intent: paymentIntent.id,
          limit: 1,
          expand: ["data.transfer"],
        },
        retrievedOnAccount === "connect" && stripeAccountId
          ? { stripeAccount: stripeAccountId }
          : undefined
      );
      charge = chargesResp.data[0] ?? null;
    }

    // Determine payment structure and refund strategy
    const isDestinationCharge = !!paymentIntent.on_behalf_of;
    const isSeparateCharge = !!paymentIntent.transfer_data?.destination;
    const hasActualTransfer = !!charge?.transfer;

    // Validate transfer exists if configured
    if (!hasActualTransfer && paymentIntent.transfer_data) {
      logError(
        new Error("Transfer configured but not created"),
        {
          layer: "api",
          requestId,
          orderId,
          paymentIntentId: paymentIntent.id,
        }
      );

      return NextResponse.json(
        {
          error: "Cannot refund: Transfer to seller account was not completed",
          requestId,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Create refund with appropriate strategy
    let refund: Stripe.Refund;

    if (isDestinationCharge) {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      });
    } else if (isSeparateCharge && hasActualTransfer) {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
        reverse_transfer: true,
      });
    } else {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      });
    }

    if (refund.status === "failed") {
      throw new Error(`Stripe refund failed: ${refund.failure_reason}`);
    }

    await ordersRepo.markRefunded(orderId, refund.amount);

    log({
      level: "info",
      layer: "api",
      message: "refund_completed",
      orderId,
      refundId: refund.id,
      amount: refund.amount,
      reversedTransfer: isSeparateCharge && hasActualTransfer,
    });

    // Send refund confirmation email
    try {
      if (order.user_id) {
        const profile = await profilesRepo.getByUserId(order.user_id);
        if (profile?.email) {
          const emailService = new OrderEmailService();
          await emailService.sendOrderRefunded({
            to: profile.email,
            orderId: order.id,
            refundAmount: refund.amount,
          });
        }
      } else if (order.guest_email) {
        const emailService = new OrderEmailService();
        await emailService.sendOrderRefunded({
          to: order.guest_email,
          orderId: order.id,
          refundAmount: refund.amount,
        });
      }
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        message: "refund_email_failed",
        orderId,
      });
    }

    return NextResponse.json(
      { success: true, refundId: refund.id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: `/api/admin/orders/${orderId}/refund`,
      message: "refund_failed",
    });

    const errorMessage =
      error.raw?.message || error.message || "Failed to process refund";

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}