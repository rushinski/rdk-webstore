// src/repositories/order-events-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db/database.types";

type OrderEventRow = Tables<"order_events">;

export class OrderEventsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async listByOrderId(orderId: string): Promise<OrderEventRow[]> {
    const { data, error } = await this.supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async hasEvent(orderId: string, type: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("order_events")
      .select("id")
      .eq("order_id", orderId)
      .eq("type", type)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return Boolean(data);
  }

  async insertEvent(input: {
    orderId: string;
    type: string;
    message?: string | null;
    createdBy?: string | null;
  }): Promise<OrderEventRow> {
    const { data, error } = await this.supabase
      .from("order_events")
      .insert({
        order_id: input.orderId,
        type: input.type,
        message: input.message ?? null,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }
}
