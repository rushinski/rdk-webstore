// src/services/evidence-service.ts
//
// Collects and stores chargeback evidence throughout the order lifecycle.
// Writes to three tables:
//   - chargeback_evidence   (one row per order, upserted incrementally)
//   - email_audit_log       (one row per email sent)
//   - shipping_tracking_events (one row per carrier event)
//   - transaction_audit_log (append-only event trail)
//
// The evidence locker is designed to win three types of disputes:
//   1. Fraud / unauthorized card use  → NoFraud transaction ID + AVS/CVV codes
//   2. Item not received              → Carrier tracking events + delivery confirmation
//   3. Item not as described          → Order snapshot with product descriptions + images

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { NoFraudDecision } from "@/services/nofraud-service";
import { log, logError } from "@/lib/utils/log";

type AddressSnapshot = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

type OrderSnapshotItem = {
  productId: string;
  variantId?: string | null;
  title: string;
  brand?: string | null;
  sku?: string | null;
  sizeLabel?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string | null;
  description?: string | null;
};

export type TrackingStatus =
  | "pre_transit"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned";

export class EvidenceService {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  /**
   * Called immediately after payment is authorized.
   * Seeds the chargeback_evidence row with fraud-defense data.
   */
  async collectPaymentEvidence(params: {
    orderId: string;
    tenantId: string;
    paymentTransactionId: string;
    paymentAmount: number;
    paymentCurrency: string;
    paymentMethodLast4?: string | null;
    paymentMethodType?: string | null;
    nofraudTransactionId?: string | null;
    nofraudDecision?: NoFraudDecision | null;
    avsResultCode?: string | null;
    cvvResultCode?: string | null;
    customerIp?: string | null;
    deviceFingerprint?: string | null;
    billingAddress?: AddressSnapshot | null;
    shippingAddress?: AddressSnapshot | null;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from("chargeback_evidence").upsert(
        {
          order_id: params.orderId,
          tenant_id: params.tenantId,
          nofraud_transaction_id: params.nofraudTransactionId ?? null,
          nofraud_decision: params.nofraudDecision ?? null,
          avs_result_code: params.avsResultCode ?? null,
          cvv_result_code: params.cvvResultCode ?? null,
          customer_ip: params.customerIp ?? null,
          device_fingerprint: params.deviceFingerprint ?? null,
          payment_transaction_id: params.paymentTransactionId,
          payment_amount: params.paymentAmount,
          payment_currency: params.paymentCurrency,
          payment_method_last4: params.paymentMethodLast4 ?? null,
          payment_method_type: params.paymentMethodType ?? null,
          billing_address_snapshot: params.billingAddress ?? null,
          shipping_address_snapshot: params.shippingAddress ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );

      if (error) {
        logError(error, {
          layer: "service",
          message: "evidence_payment_upsert_failed",
          orderId: params.orderId,
        });
        return;
      }

      log({
        level: "info",
        layer: "service",
        message: "evidence_payment_collected",
        orderId: params.orderId,
        nofraudDecision: params.nofraudDecision,
      });

      // Also write to the immutable audit log
      await this.writeAuditEvent({
        orderId: params.orderId,
        tenantId: params.tenantId,
        eventType: params.nofraudDecision
          ? `nofraud_${params.nofraudDecision}`
          : "payment_succeeded",
        actor: "system",
        data: {
          paymentTransactionId: params.paymentTransactionId,
          paymentAmount: params.paymentAmount,
          nofraudTransactionId: params.nofraudTransactionId,
          nofraudDecision: params.nofraudDecision,
          avsResultCode: params.avsResultCode,
          cvvResultCode: params.cvvResultCode,
        },
        ipAddress: params.customerIp,
      });
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "evidence_payment_collection_failed",
        orderId: params.orderId,
      });
    }
  }

  /**
   * Called at purchase time — snapshots product data for item-not-as-described defense.
   * Store the exact state of products, prices, and descriptions at time of purchase.
   */
  async snapshotOrderAtPurchase(params: {
    orderId: string;
    tenantId: string;
    items: OrderSnapshotItem[];
    taxCalculationSnapshot?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const snapshot = {
        capturedAt: new Date().toISOString(),
        items: params.items,
      };

      const { error } = await this.supabase.from("chargeback_evidence").upsert(
        {
          order_id: params.orderId,
          tenant_id: params.tenantId,
          order_snapshot: snapshot,
          tax_calculation_snapshot: params.taxCalculationSnapshot ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );

      if (error) {
        logError(error, {
          layer: "service",
          message: "evidence_order_snapshot_failed",
          orderId: params.orderId,
        });
        return;
      }

      log({
        level: "info",
        layer: "service",
        message: "evidence_order_snapshot_stored",
        orderId: params.orderId,
        itemCount: params.items.length,
      });
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "evidence_order_snapshot_error",
        orderId: params.orderId,
      });
    }
  }

  /**
   * Called when an email is sent to the customer.
   * Stores the full HTML snapshot and message ID for evidence.
   */
  async recordEmailSent(params: {
    orderId: string | null;
    tenantId: string;
    emailType: string;
    recipientEmail: string;
    subject: string;
    htmlSnapshot: string;
    plainTextSnapshot?: string | null;
    messageId?: string | null;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from("email_audit_log").insert({
        order_id: params.orderId,
        tenant_id: params.tenantId,
        email_type: params.emailType,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        html_snapshot: params.htmlSnapshot,
        plain_text_snapshot: params.plainTextSnapshot ?? null,
        message_id: params.messageId ?? null,
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
      });

      if (error) {
        logError(error, {
          layer: "service",
          message: "evidence_email_log_failed",
          orderId: params.orderId,
          emailType: params.emailType,
        });
        return;
      }

      log({
        level: "info",
        layer: "service",
        message: "evidence_email_logged",
        orderId: params.orderId,
        emailType: params.emailType,
        messageId: params.messageId,
      });

      // Write to audit log
      if (params.orderId) {
        await this.writeAuditEvent({
          orderId: params.orderId,
          tenantId: params.tenantId,
          eventType: "email_sent",
          actor: "system",
          data: {
            emailType: params.emailType,
            recipientEmail: params.recipientEmail,
            subject: params.subject,
            messageId: params.messageId,
          },
        });
      }
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "evidence_email_record_error",
        orderId: params.orderId,
      });
    }
  }

  /**
   * Called when a carrier tracking event is received.
   * Records each milestone event (in_transit → out_for_delivery → delivered).
   * On delivery, also updates chargeback_evidence with delivery confirmation.
   */
  async recordTrackingEvent(params: {
    orderId: string;
    tenantId: string;
    carrier: string;
    trackingNumber: string;
    eventTimestamp: Date;
    status: TrackingStatus;
    location?: string | null;
    description?: string | null;
    rawCarrierResponse?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const { error: trackingError } = await this.supabase
        .from("shipping_tracking_events")
        .insert({
          order_id: params.orderId,
          tenant_id: params.tenantId,
          carrier: params.carrier,
          tracking_number: params.trackingNumber,
          event_timestamp: params.eventTimestamp.toISOString(),
          status: params.status,
          location: params.location ?? null,
          description: params.description ?? null,
          raw_carrier_response: params.rawCarrierResponse ?? null,
        });

      if (trackingError) {
        logError(trackingError, {
          layer: "service",
          message: "evidence_tracking_insert_failed",
          orderId: params.orderId,
        });
        return;
      }

      // On delivery — update chargeback_evidence with confirmed delivery
      if (params.status === "delivered") {
        const deliverySnapshot = {
          status: params.status,
          location: params.location,
          description: params.description,
          eventTimestamp: params.eventTimestamp.toISOString(),
          carrier: params.carrier,
          trackingNumber: params.trackingNumber,
          raw: params.rawCarrierResponse,
        };

        const { error: evidenceError } = await this.supabase
          .from("chargeback_evidence")
          .upsert(
            {
              order_id: params.orderId,
              tenant_id: params.tenantId,
              carrier: params.carrier,
              tracking_number: params.trackingNumber,
              delivery_confirmed_at: params.eventTimestamp.toISOString(),
              delivery_event_snapshot: deliverySnapshot,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "order_id" },
          );

        if (evidenceError) {
          logError(evidenceError, {
            layer: "service",
            message: "evidence_delivery_update_failed",
            orderId: params.orderId,
          });
        }

        await this.writeAuditEvent({
          orderId: params.orderId,
          tenantId: params.tenantId,
          eventType: "delivered",
          actor: "system",
          data: {
            carrier: params.carrier,
            trackingNumber: params.trackingNumber,
            deliveredAt: params.eventTimestamp.toISOString(),
            location: params.location,
          },
        });
      }

      log({
        level: "info",
        layer: "service",
        message: "evidence_tracking_recorded",
        orderId: params.orderId,
        status: params.status,
        carrier: params.carrier,
      });
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "evidence_tracking_record_error",
        orderId: params.orderId,
      });
    }
  }

  /**
   * Write an immutable event to the transaction_audit_log.
   * This table has no UPDATE/DELETE RLS — append-only for legal defensibility.
   */
  async writeAuditEvent(params: {
    orderId?: string | null;
    tenantId: string;
    eventType: string;
    actor: string;
    data?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from("transaction_audit_log").insert({
        order_id: params.orderId ?? null,
        tenant_id: params.tenantId,
        event_type: params.eventType,
        actor: params.actor,
        data: params.data ?? null,
        ip_address: params.ipAddress ?? null,
        user_agent: params.userAgent ?? null,
        created_at: new Date().toISOString(),
      });

      if (error) {
        logError(error, {
          layer: "service",
          message: "audit_log_write_failed",
          orderId: params.orderId,
          eventType: params.eventType,
        });
      }
    } catch (error) {
      // Swallow — audit log failures must never break the main payment flow
      logError(error, {
        layer: "service",
        message: "audit_log_write_error",
        orderId: params.orderId,
      });
    }
  }
}
