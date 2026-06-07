import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type LightspeedWebhookEvent = {
  id: string;
  tenant_id: string | null;
  event_id: string;
  topic: string;
  payload: unknown;
  processed_at: string | null;
};

export class LightspeedWebhookEventsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async insertIfAbsent(input: {
    tenantId: string | null;
    eventId: string;
    topic: string;
    payload: unknown;
  }): Promise<{
    inserted: boolean;
    event: LightspeedWebhookEvent;
  }> {
    const { data, error } = await this.supabase
      .from("lightspeed_webhook_events")
      .insert({
        tenant_id: input.tenantId,
        event_id: input.eventId,
        topic: input.topic,
        payload: input.payload as never,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return { inserted: true, event: data as LightspeedWebhookEvent };
  }

  async markProcessed(id: string) {
    const { error } = await this.supabase
      .from("lightspeed_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
