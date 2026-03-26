// src/repositories/payment-webhook-events-repo.ts
//
// Handles deduplication for PayRilla webhooks
// using the `payment_webhook_events` table.

import type { PostgrestError } from "@supabase/supabase-js";

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { hashString } from "@/lib/utils/crypto";

export class PaymentWebhookEventsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async hasProcessed(webhookEventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("payment_webhook_events")
      .select("id")
      .eq("webhook_event_id", webhookEventId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return !!data;
  }

  async recordProcessed(
    webhookEventId: string,
    type: string,
    created: number,
    payload: unknown,
    orderId?: string,
  ): Promise<void> {
    const payloadHash = hashString(JSON.stringify(payload));

    const { error } = await this.supabase.from("payment_webhook_events").insert({
      webhook_event_id: webhookEventId,
      type,
      created,
      payload_hash: payloadHash,
      order_id: orderId ?? null,
    });

    if (error && !this.isDuplicateKeyError(error)) {
      throw error;
    }
  }

  private isDuplicateKeyError(error: PostgrestError): boolean {
    return "code" in error && error.code === "23505";
  }
}
