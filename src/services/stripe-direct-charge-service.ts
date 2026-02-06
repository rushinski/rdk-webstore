// src/services/stripe-direct-charge-service.ts
//
// CRITICAL CHANGE: This service creates PaymentIntents as DIRECT CHARGES
// on the Connect account. The platform never touches the money.
//
// Old (broken):
//   stripe.paymentIntents.create({ transfer_data: { destination: connectId } })
//   → Money flows: Customer → Platform → Connect (platform touches funds)
//
// New (correct):
//   stripe.paymentIntents.create({ ... }, { stripeAccount: connectId })
//   → Money flows: Customer → Connect directly (platform never touches funds)
//
// For the platform fee, we use `application_fee_amount` on the direct charge.

import Stripe from "stripe";

import { env } from "@/config/env";
import { log } from "@/lib/utils/log";
import type {
  FulfillmentMethod,
  ResolvedLineItem,
  SUPPORTED_PAYMENT_METHODS,
} from "@/types/domain/checkout";

const platformStripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

/**
 * Get a Stripe client scoped to a Connect account (for direct charges).
 */
function getConnectClient(stripeAccountId: string): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
    stripeAccount: stripeAccountId,
  });
}

export interface CreateDirectPaymentIntentParams {
  stripeAccountId: string;
  amountCents: number;
  currency?: string;
  metadata: Record<string, string>;
  customerId?: string; // Stripe customer on the Connect account (if any)
  receiptEmail?: string;
  idempotencyKey: string;
  applicationFeeCents?: number; // platform fee (0 if no fee)
  shipping?: Stripe.PaymentIntentCreateParams["shipping"];
}

export interface DirectPaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}

export class StripeDirectChargeService {
  /**
   * Create a PaymentIntent as a DIRECT CHARGE on the Connect account.
   *
   * Key differences from the old transfer-based approach:
   * 1. Created with `stripeAccount` header → charge lives on Connect account
   * 2. Uses `application_fee_amount` instead of `transfer_data`
   * 3. Payment methods configured on the Connect account are used
   * 4. The customer sees the Connect account's business name on their statement
   * 5. Platform NEVER holds the funds
   */
  async createPaymentIntent(
    params: CreateDirectPaymentIntentParams,
  ): Promise<DirectPaymentIntentResult> {
    const connectClient = getConnectClient(params.stripeAccountId);

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amountCents,
      currency: params.currency ?? "usd",
      // Enable automatic payment methods so the Connect account's
      // enabled methods (card, afterpay, affirm, klarna, etc.) are used.
      // This is the simplest and most flexible approach — the Connect
      // account controls which methods are available via their dashboard.
      automatic_payment_methods: { enabled: true },
      metadata: params.metadata,
    };

    // Platform fee (optional — set to 0 if the platform takes no cut)
    if (params.applicationFeeCents && params.applicationFeeCents > 0) {
      createParams.application_fee_amount = params.applicationFeeCents;
    }

    // Customer on the Connect account (if we've created one there)
    if (params.customerId) {
      createParams.customer = params.customerId;
    }

    // Receipt email
    if (params.receiptEmail) {
      createParams.receipt_email = params.receiptEmail;
    }

    // Shipping info (for ship fulfillment, if known at creation time)
    if (params.shipping) {
      createParams.shipping = params.shipping;
    }

    const paymentIntent = await connectClient.paymentIntents.create(createParams, {
      idempotencyKey: params.idempotencyKey,
    });

    log({
      level: "info",
      layer: "service",
      message: "direct_charge_payment_intent_created",
      paymentIntentId: paymentIntent.id,
      stripeAccountId: params.stripeAccountId,
      amountCents: params.amountCents,
      applicationFeeCents: params.applicationFeeCents ?? 0,
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
    };
  }

  /**
   * Update an existing PaymentIntent on the Connect account.
   */
  async updatePaymentIntent(
    stripeAccountId: string,
    paymentIntentId: string,
    params: {
      amountCents?: number;
      metadata?: Record<string, string>;
      shipping?: Stripe.PaymentIntentCreateParams["shipping"];
    },
  ): Promise<void> {
    const connectClient = getConnectClient(stripeAccountId);

    const updateParams: Stripe.PaymentIntentUpdateParams = {};
    if (params.amountCents !== undefined) {
      updateParams.amount = params.amountCents;
    }
    if (params.metadata) {
      updateParams.metadata = params.metadata;
    }
    if (params.shipping) {
      updateParams.shipping = params.shipping;
    }

    await connectClient.paymentIntents.update(paymentIntentId, updateParams);

    log({
      level: "info",
      layer: "service",
      message: "direct_charge_payment_intent_updated",
      paymentIntentId,
      stripeAccountId,
      amountCents: params.amountCents,
    });
  }

  /**
   * Retrieve a PaymentIntent from the Connect account.
   */
  async retrievePaymentIntent(
    stripeAccountId: string,
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    const connectClient = getConnectClient(stripeAccountId);
    return connectClient.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Cancel a PaymentIntent on the Connect account.
   */
  async cancelPaymentIntent(
    stripeAccountId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const connectClient = getConnectClient(stripeAccountId);
    try {
      await connectClient.paymentIntents.cancel(paymentIntentId);
      log({
        level: "info",
        layer: "service",
        message: "direct_charge_payment_intent_canceled",
        paymentIntentId,
        stripeAccountId,
      });
    } catch (err) {
      // Already canceled/succeeded — safe to ignore
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("cannot be canceled")) {
        throw err;
      }
    }
  }

  /**
   * Issue a refund on the Connect account.
   */
  async refund(
    stripeAccountId: string,
    paymentIntentId: string,
    amountCents?: number,
  ): Promise<Stripe.Refund> {
    const connectClient = getConnectClient(stripeAccountId);
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amountCents) {
      refundParams.amount = amountCents;
    }
    // Reverse the application fee proportionally
    refundParams.reverse_transfer = false; // not applicable for direct charges
    refundParams.refund_application_fee = true;

    const refund = await connectClient.refunds.create(refundParams);

    log({
      level: "info",
      layer: "service",
      message: "direct_charge_refund_created",
      refundId: refund.id,
      paymentIntentId,
      stripeAccountId,
      amountCents: refund.amount,
    });

    return refund;
  }

  /**
   * Create or retrieve a Stripe Customer on the Connect account.
   * With direct charges, the customer must exist on the Connect account.
   */
  async getOrCreateConnectCustomer(
    stripeAccountId: string,
    params: { email: string; metadata?: Record<string, string> },
  ): Promise<string> {
    const connectClient = getConnectClient(stripeAccountId);

    // Search for existing customer by email on the Connect account
    const existing = await connectClient.customers.list({
      email: params.email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    // Create new customer on the Connect account
    const customer = await connectClient.customers.create({
      email: params.email,
      metadata: params.metadata ?? {},
    });

    return customer.id;
  }
}