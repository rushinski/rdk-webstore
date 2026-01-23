// src/repositories/order-access-tokens-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db/database.types";

type OrderAccessTokenRow = Tables<"order_access_tokens">;

export class OrderAccessTokensRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async insertToken(input: {
    orderId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<OrderAccessTokenRow> {
    const { data, error } = await this.supabase
      .from("order_access_tokens")
      .insert({
        order_id: input.orderId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  async findValidToken(input: {
    orderId: string;
    tokenHash: string;
    now: string;
  }): Promise<OrderAccessTokenRow | null> {
    const { data, error } = await this.supabase
      .from("order_access_tokens")
      .select("*")
      .eq("order_id", input.orderId)
      .eq("token_hash", input.tokenHash)
      .gt("expires_at", input.now)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  }

  async touchLastUsed(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("order_access_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
