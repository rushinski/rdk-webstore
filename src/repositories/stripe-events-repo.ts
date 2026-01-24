import type { PostgrestError } from "@supabase/supabase-js";

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/db/database.types";
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

    if (error) {
      throw error;
    }
    return !!data;
  }

  async recordProcessed(
    stripeEventId: string,
    type: string,
    created: number,
    payload: unknown, // Accept any Stripe object type
    orderId?: string,
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

    // Type guard for PostgrestError with code property
    if (error && !this.isDuplicateKeyError(error)) {
      throw error;
    }
  }

  private isDuplicateKeyError(error: PostgrestError): boolean {
    return "code" in error && error.code === "23505";
  }
}
