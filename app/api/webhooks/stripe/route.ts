// app/api/webhooks/stripe/route.ts (FIXED)
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { StripeOrderJob } from "@/jobs/stripe-order-job";
import { ProfileRepository } from "@/repositories/profile-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/log";
import { env } from "@/config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      log({
        level: "warn",
        layer: "api",
        message: "stripe_webhook_missing_signature",
        requestId,
      });
      return NextResponse.json(
        { error: "Missing signature", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logError(err, {
        layer: "api",
        requestId,
        route: "/api/stripe/webhook",
      });
      return NextResponse.json(
        { error: "Invalid signature", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    log({
      level: "info",
      layer: "api",
      message: "stripe_webhook_received",
      requestId,
      eventType: event.type,
      eventId: event.id,
    });

    const adminSupabase = createSupabaseAdminClient();
    const job = new StripeOrderJob(adminSupabase, adminSupabase);

    switch (event.type) {
      case "checkout.session.completed":
        await job.processCheckoutSessionCompleted(event, requestId);
        break;

      case "payment_intent.succeeded":
        await job.processPaymentIntentSucceeded(event, requestId);

        // ✅ Record tax transaction using tenant's Stripe Connect account
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const taxCalculationId = paymentIntent.metadata?.tax_calculation_id;
        const orderId = paymentIntent.metadata?.order_id;
        const tenantId = paymentIntent.metadata?.tenant_id;

        log({
          level: "info",
          layer: "stripe",
          message: "payment_intent_metadata",
          requestId,
          orderId,
          taxCalculationId,
          tenantId,
          hasAllMetadata: !!(taxCalculationId && orderId && tenantId),
        });

        if (taxCalculationId && taxCalculationId !== "" && orderId && tenantId) {
          try {
            // Get the tenant's Stripe Connect account ID
            const profileRepo = new ProfileRepository(adminSupabase);
            const stripeAccountId = await profileRepo.getStripeAccountIdForTenant(tenantId);

            if (!stripeAccountId) {
              log({
                level: "warn",
                layer: "stripe",
                message: "tax_transaction_missing_connect_account",
                requestId,
                orderId,
                tenantId,
              });
            } else {
              log({
                level: "info",
                layer: "stripe",
                message: "creating_tax_transaction",
                requestId,
                orderId,
                taxCalculationId,
                stripeAccountId,
              });

              // ✅ Create tax transaction on the tenant's Stripe Connect account
              const taxService = new StripeTaxService(adminSupabase, stripeAccountId);
              const taxTransactionId = await taxService.createTaxTransaction({
                taxCalculationId,
                reference: orderId,
              });

              if (taxTransactionId) {
                await adminSupabase
                  .from("orders")
                  .update({ stripe_tax_transaction_id: taxTransactionId })
                  .eq("id", orderId);

                log({
                  level: "info",
                  layer: "stripe",
                  message: "tax_transaction_created",
                  requestId,
                  orderId,
                  taxTransactionId,
                  stripeAccountId,
                });
              } else {
                log({
                  level: "warn",
                  layer: "stripe",
                  message: "tax_transaction_not_created",
                  requestId,
                  orderId,
                  taxCalculationId,
                });
              }
            }
          } catch (taxError) {
            logError(taxError, {
              layer: "stripe",
              requestId,
              message: "Failed to create tax transaction",
              orderId,
              taxCalculationId,
              tenantId,
            });
          }
        } else {
          log({
            level: "info",
            layer: "stripe",
            message: "skipping_tax_transaction",
            requestId,
            reason: "missing_metadata",
            orderId,
            taxCalculationId,
            tenantId,
          });
        }
        break;

      case "account.updated":
        log({
          level: "info",
          layer: "stripe",
          message: "stripe_account_updated",
          requestId,
          eventId: event.id,
          accountId: (event.data.object as Stripe.Account).id,
        });
        break;

      case "payout.created":
      case "payout.updated":
      case "payout.paid":
      case "payout.failed":
        log({
          level: "info",
          layer: "stripe",
          message: `stripe_payout_${event.type.split(".")[1]}`,
          requestId,
          eventId: event.id,
          payoutId: (event.data.object as Stripe.Payout).id,
          payout_status: (event.data.object as Stripe.Payout).status,
          amount: (event.data.object as Stripe.Payout).amount,
        });
        break;

      case "charge.refunded":
      case "charge.refund.updated":
      case "refund.created":
      case "refund.updated":
        await handleRefundEvent(event, requestId, adminSupabase);
        break;

      default:
        log({
          level: "info",
          layer: "stripe",
          message: "stripe_webhook_unhandled_event",
          requestId,
          eventType: event.type,
          eventId: event.id,
        });
    }

    return NextResponse.json(
      { received: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/stripe/webhook",
    });

    return NextResponse.json(
      { error: "Internal error", requestId },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}

async function handleRefundEvent(
  event: Stripe.Event,
  requestId: string,
  adminSupabase: any,
) {
  try {
    const refund = event.data.object as Stripe.Refund;

    log({
      level: "info",
      layer: "stripe",
      message: "stripe_refund_event",
      requestId,
      eventId: event.id,
      refundId: refund.id,
      chargeId: refund.charge,
      amount: refund.amount,
      refund_status: refund.status,
      reason: refund.reason,
    });

    const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;

    if (!chargeId) {
      log({
        level: "warn",
        layer: "stripe",
        message: "refund_missing_charge_id",
        requestId,
        refundId: refund.id,
      });
      return;
    }

    const { data: orders, error: queryError } = await adminSupabase
      .from("orders")
      .select("id, status, refund_amount, refund_reason")
      .or(
        `stripe_charge_id.eq.${chargeId},stripe_payment_intent_id.eq.${refund.payment_intent}`,
      )
      .limit(1);

    if (queryError) {
      throw queryError;
    }

    if (!orders || orders.length === 0) {
      log({
        level: "warn",
        layer: "stripe",
        message: "refund_order_not_found",
        requestId,
        chargeId,
        refundId: refund.id,
      });
      return;
    }

    const order = orders[0];

    const updateData: any = {
      refund_amount: refund.amount,
      refund_reason: refund.reason || "requested_by_customer",
      refunded_at: new Date(refund.created * 1000).toISOString(),
    };

    if (refund.status === "succeeded") {
      updateData.status = "refunded";
    } else if (refund.status === "pending") {
      updateData.status = "refund_pending";
    } else if (refund.status === "failed") {
      updateData.status = "refund_failed";
    }

    const { error: updateError } = await adminSupabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    log({
      level: "info",
      layer: "stripe",
      message: "refund_order_updated",
      requestId,
      orderId: order.id,
      refundId: refund.id,
      amount: refund.amount,
      refund_status: refund.status,
    });
  } catch (error: any) {
    logError(error, {
      layer: "stripe",
      requestId,
      event: "handle_refund_event",
      message: "Failed to process refund event",
    });
  }
}