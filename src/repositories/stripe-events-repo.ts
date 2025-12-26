// src/repositories/stripe-events-repo.ts (NEW)

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";
import { hashString } from "@/lib/crypto";

type StripeEventInsert = TablesInsert<"stripe_events">;

export class StripeEventsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async hasProcessed(stripeEventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("stripe_events")
      .select("id")
      .eq("stripe_event_id", stripeEventId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  async recordProcessed(
    stripeEventId: string,
    type: string,
    created: number,
    payload: any,
    orderId?: string
  ): Promise<void> {
    const payloadHash = hashString(JSON.stringify(payload));

    const insert: StripeEventInsert = {
      stripe_event_id: stripeEventId,
      type,
      created,
      payload_hash: payloadHash,
      order_id: orderId ?? null,
    };

    const { error } = await this.supabase.from("stripe_events").insert(insert);

    if (error && (error as any).code !== "23505") {
      // ignore duplicate key
      throw error;
    }
  }
}