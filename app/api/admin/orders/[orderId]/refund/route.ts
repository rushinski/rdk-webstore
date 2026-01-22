// app/api/admin/orders/[orderId]/refund/route.ts (DEBUG VERSION - FIXED)
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
  if (typeof latestCharge === "string") return null; // not expanded
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

    const stripeAccountId = await profilesRepo.getStripeAccountIdForTenant(
      tenantId
    );

    log({
      level: "info",
      layer: "api",
      message: "DEBUG: Starting refund process",
      orderId,
      tenantId,
      stripeAccountId: stripeAccountId ?? "not_configured",
      paymentIntentId: order.stripe_payment_intent_id,
    });

    // ========================================
    // STEP 1: Retrieve payment intent
    // ========================================
    let paymentIntent: Stripe.PaymentIntent;
    let retrievedOnAccount: "platform" | "connect" = "platform";

    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id,
        { expand: ["latest_charge", "latest_charge.transfer"] }
      );

      retrievedOnAccount = "platform";

      log({
        level: "info",
        layer: "api",
        message: "DEBUG: Payment intent found on PLATFORM account",
        orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentIntentStatus: paymentIntent.status,
        hasLatestCharge: !!paymentIntent.latest_charge,
        latestChargeId:
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id ?? null,
        hasTransferData: !!paymentIntent.transfer_data,
        transferDestination: paymentIntent.transfer_data?.destination ?? null,
        onBehalfOf: paymentIntent.on_behalf_of ?? null,
        application: paymentIntent.application ?? null,
      });
    } catch (platformError: any) {
      log({
        level: "warn",
        layer: "api",
        message: "DEBUG: Payment intent NOT found on platform account",
        orderId,
        error: platformError.message,
      });

      if (stripeAccountId) {
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(
            order.stripe_payment_intent_id,
            { expand: ["latest_charge", "latest_charge.transfer"] },
            { stripeAccount: stripeAccountId } // ✅ correct placement (3rd arg)
          );

          retrievedOnAccount = "connect";

          log({
            level: "info",
            layer: "api",
            message: "DEBUG: Payment intent found on CONNECT account",
            orderId,
            stripeAccountId,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            paymentIntentStatus: paymentIntent.status,
          });
        } catch (connectError: any) {
          log({
            level: "error",
            layer: "api",
            message: "DEBUG: Payment intent not found on EITHER account",
            orderId,
            platformError: platformError.message,
            connectError: connectError.message,
          });

          return NextResponse.json(
            {
              error: "Payment intent not found on platform or Connect account",
              details: {
                platformError: platformError.message,
                connectError: connectError.message,
              },
              requestId,
            },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
      } else {
        throw platformError;
      }
    }

    // ========================================
    // STEP 1.5: Ensure we have a Charge (fallback to charges.list)
    // ========================================
    let charge: Stripe.Charge | null = toExpandedCharge(
      paymentIntent.latest_charge
    );

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

      log({
        level: "info",
        layer: "api",
        message: "DEBUG: Loaded charge via charges.list fallback",
        orderId,
        retrievedOnAccount,
        foundCharge: !!charge,
        chargeId: charge?.id ?? null,
      });
    }

    // Optional charge-level debug (no destination usage)
    if (charge) {
      let transferDetails: null | {
        id: string;
        amount: number;
        destination: Stripe.Transfer["destination"];
        reversed: boolean;
        reversals: number;
      } = null;

      if (charge.transfer) {
        try {
          const transfer =
            typeof charge.transfer === "string"
              ? await stripe.transfers.retrieve(charge.transfer)
              : charge.transfer;

          transferDetails = {
            id: transfer.id,
            amount: transfer.amount,
            destination: transfer.destination,
            reversed: transfer.reversed,
            reversals: transfer.reversals?.data?.length ?? 0,
          };
        } catch (transferError: any) {
          log({
            level: "warn",
            layer: "api",
            message: "DEBUG: Could not fetch transfer details",
            orderId,
            transferId: charge.transfer,
            error: transferError.message,
          });
        }
      }

      log({
        level: "info",
        layer: "api",
        message: "DEBUG: Charge details",
        orderId,
        chargeId: charge.id,
        chargeAmount: charge.amount,
        chargeStatus: charge.status,
        paid: charge.paid,
        refunded: charge.refunded,
        amountRefunded: charge.amount_refunded,
        hasTransfer: !!charge.transfer,
        transferId: charge.transfer ?? null,
        transferDetails,
        hasApplicationFee: !!charge.application_fee,
        applicationFeeAmount: charge.application_fee_amount ?? null,
      });
    }

    // ========================================
    // STEP 2: Determine refund strategy (NO charge.destination)
    // ========================================
    // Stripe TS typings may not include `charge.destination`, so we infer using PI fields:
    // - Destination charge: on_behalf_of is typically set
    // - Separate charges & transfers: transfer_data.destination is set
    const isDestinationCharge = !!paymentIntent.on_behalf_of;
    const isSeparateCharge = !!paymentIntent.transfer_data?.destination;
    const isDirectCharge = !isDestinationCharge && !isSeparateCharge;

    log({
      level: "info",
      layer: "api",
      message: "DEBUG: Payment structure analysis",
      orderId,
      isDirectCharge,
      isDestinationCharge,
      isSeparateCharge,
      hasOnBehalfOf: !!paymentIntent.on_behalf_of,
      hasTransferDataDestination: !!paymentIntent.transfer_data?.destination,
    });

    // ========================================
    // STEP 3: Create refund based on payment type
    // ========================================
    let refund: Stripe.Refund;

    const hasActualTransfer = !!charge?.transfer;

    // If you configured transfer_data but no transfer exists, reverse_transfer will fail
    if (!hasActualTransfer && paymentIntent.transfer_data) {
      log({
        level: "error",
        layer: "api",
        message:
          "DEBUG: Transfer was configured but not created - cannot reverse transfer that doesn't exist",
        orderId,
        paymentIntentId: paymentIntent.id,
        transferData: paymentIntent.transfer_data,
        chargeExists: !!charge,
        chargeTransfer: charge?.transfer ?? null,
      });

      return NextResponse.json(
        {
          error:
            "Cannot refund: Transfer to seller account was not completed. This order may need manual review.",
          details: {
            reason: "transfer_not_created",
            suggestion:
              "Check Stripe dashboard for transfer status or contact support",
          },
          requestId,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (isDestinationCharge) {
      // For destination charges, refunding the PI is usually enough.
      // (You can also refund by charge id, but we keep it consistent.)
      log({
        level: "info",
        layer: "api",
        message: "DEBUG: Using DESTINATION CHARGE refund strategy",
        orderId,
        paymentIntentId: paymentIntent.id,
      });

      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      });
    } else if (isSeparateCharge && hasActualTransfer) {
      log({
        level: "info",
        layer: "api",
        message:
          "DEBUG: Using SEPARATE CHARGE refund strategy with transfer reversal",
        orderId,
        paymentIntentId: paymentIntent.id,
        transferId: charge?.transfer ?? null,
      });

      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
        reverse_transfer: true,
      });
    } else {
      log({
        level: "warn",
        layer: "api",
        message:
          "DEBUG: Using DIRECT CHARGE refund strategy (no transfer to reverse)",
        orderId,
      });

      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      });
    }

    log({
      level: "info",
      layer: "api",
      message: "DEBUG: Refund created successfully",
      orderId,
      refundId: refund.id,
      amount: refund.amount,
      refundStatus: refund.status,
      sourceTransferReversal: refund.source_transfer_reversal ?? null,
    });

    if (refund.status === "failed") {
      throw new Error(
        `Stripe refund failed with reason: ${refund.failure_reason}`
      );
    }

    await ordersRepo.markRefunded(orderId, refund.amount);

    log({
      level: "info",
      layer: "api",
      message: "Refund completed successfully",
      orderId,
      refundId: refund.id,
      amount: refund.amount,
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
        message: "Failed to send refund confirmation email",
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
      message: "Failed to refund order",
    });

    const errorMessage =
      error.raw?.message || error.message || "Failed to process refund.";

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
