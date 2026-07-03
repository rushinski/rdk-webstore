// src/repositories/payment-transactions-repo.ts
//
// CRUD for payment_transactions and payment_events tables.
// payment_events is append-only — never update or delete rows.

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db/database.types";

export type PaymentTransactionInsert = {
  orderId: string;
  tenantId?: string | null;
  amountRequested: number;
  currency?: string;
  billingName?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingZip?: string | null;
  billingCountry?: string | null;
  billingPhone?: string | null;
  customerEmail?: string | null;
  customerIp?: string | null;
  cardExpiryMonth?: number | null;
  cardExpiryYear?: number | null;
};

export type PaymentTransactionUpdate = {
  processorReference?: number | null;
  authorizationCode?: string | null;
  paymentStatus?: string;
  cardType?: string | null;
  cardLast4?: string | null;
  cardBin?: string | null;
  avsResultCode?: string | null;
  cvv2ResultCode?: string | null;
  threeDsStatus?: string | null;
  threeDsEci?: string | null;
  riskReviewId?: string | null;
  riskDecision?: string | null;
  amountAuthorized?: number | null;
  amountCaptured?: number | null;
  amountRefunded?: number | null;
};

export type PaymentTransactionRecord = {
  id: string;
  processorReference: number | null;
  authorizationCode: string | null;
  paymentStatus: string | null;
  cardType: string | null;
  cardLast4: string | null;
  cardBin: string | null;
  avsResultCode: string | null;
  cvv2ResultCode: string | null;
  threeDsStatus: string | null;
  threeDsEci: string | null;
  riskReviewId: string | null;
  riskDecision: string | null;
  amountAuthorized: number | null;
  amountCaptured: number | null;
  amountRefunded: number | null;
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  billingPhone: string | null;
  customerEmail: string | null;
  customerIp: string | null;
};

export type PaymentEventInsert = {
  paymentTransactionId: string;
  orderId: string;
  tenantId?: string | null;
  eventType: string;
  eventData?: Record<string, unknown>;
};

export class PaymentTransactionsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async create(params: PaymentTransactionInsert): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("payment_transactions")
      .insert({
        order_id: params.orderId,
        tenant_id: params.tenantId ?? null,
        amount_requested: params.amountRequested,
        currency: params.currency ?? "USD",
        payment_status: "pending",
        billing_name: params.billingName ?? null,
        billing_address: params.billingAddress ?? null,
        billing_city: params.billingCity ?? null,
        billing_state: params.billingState ?? null,
        billing_zip: params.billingZip ?? null,
        billing_country: params.billingCountry ?? null,
        billing_phone: params.billingPhone ?? null,
        customer_email: params.customerEmail ?? null,
        customer_ip: params.customerIp ?? null,
        card_expiry_month: params.cardExpiryMonth ?? null,
        card_expiry_year: params.cardExpiryYear ?? null,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  async update(id: string, params: PaymentTransactionUpdate): Promise<void> {
    const patch: Record<string, unknown> = {};

    if (params.processorReference !== undefined) {
      patch.processor_reference = params.processorReference;
    }
    if (params.authorizationCode !== undefined) {
      patch.authorization_code = params.authorizationCode;
    }
    if (params.paymentStatus !== undefined) {
      patch.payment_status = params.paymentStatus;
    }
    if (params.cardType !== undefined) {
      patch.card_type = params.cardType;
    }
    if (params.cardLast4 !== undefined) {
      patch.card_last4 = params.cardLast4;
    }
    if (params.cardBin !== undefined) {
      patch.card_bin = params.cardBin;
    }
    if (params.avsResultCode !== undefined) {
      patch.avs_result_code = params.avsResultCode;
    }
    if (params.cvv2ResultCode !== undefined) {
      patch.cvv2_result_code = params.cvv2ResultCode;
    }
    if (params.threeDsStatus !== undefined) {
      patch.three_ds_status = params.threeDsStatus;
    }
    if (params.threeDsEci !== undefined) {
      patch.three_ds_eci = params.threeDsEci;
    }
    if (params.riskReviewId !== undefined) {
      patch.risk_review_id = params.riskReviewId;
    }
    if (params.riskDecision !== undefined) {
      patch.risk_decision = params.riskDecision;
    }
    if (params.amountAuthorized !== undefined) {
      patch.amount_authorized = params.amountAuthorized;
    }
    if (params.amountCaptured !== undefined) {
      patch.amount_captured = params.amountCaptured;
    }
    if (params.amountRefunded !== undefined) {
      patch.amount_refunded = params.amountRefunded;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    const { error } = await this.supabase
      .from("payment_transactions")
      .update(patch)
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  async getByOrderId(orderId: string): Promise<PaymentTransactionRecord | null> {
    const { data, error } = await this.supabase
      .from("payment_transactions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    return {
      id: data.id,
      processorReference: data.processor_reference ?? null,
      authorizationCode: data.authorization_code ?? null,
      paymentStatus: data.payment_status ?? null,
      cardType: data.card_type ?? null,
      cardLast4: data.card_last4 ?? null,
      cardBin: data.card_bin ?? null,
      avsResultCode: data.avs_result_code ?? null,
      cvv2ResultCode: data.cvv2_result_code ?? null,
      threeDsStatus: data.three_ds_status ?? null,
      threeDsEci: data.three_ds_eci ?? null,
      riskReviewId: data.risk_review_id ?? null,
      riskDecision: data.risk_decision ?? null,
      amountAuthorized: data.amount_authorized ?? null,
      amountCaptured: data.amount_captured ?? null,
      amountRefunded: data.amount_refunded ?? null,
      billingName: data.billing_name ?? null,
      billingAddress: data.billing_address ?? null,
      billingCity: data.billing_city ?? null,
      billingState: data.billing_state ?? null,
      billingZip: data.billing_zip ?? null,
      billingCountry: data.billing_country ?? null,
      billingPhone: data.billing_phone ?? null,
      customerEmail: data.customer_email ?? null,
      customerIp: data.customer_ip ?? null,
    };
  }

  async logEvent(params: PaymentEventInsert): Promise<void> {
    const { error } = await this.supabase.from("payment_events").insert({
      payment_transaction_id: params.paymentTransactionId,
      order_id: params.orderId,
      tenant_id: params.tenantId ?? null,
      event_type: params.eventType,
      event_data: (params.eventData ?? {}) as Json,
    });

    if (error) {
      throw error;
    }
  }

  async getEventsByOrderId(orderId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase
      .from("payment_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return (data ?? []) as Record<string, unknown>[];
  }
}
