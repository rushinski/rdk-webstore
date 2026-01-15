// src/repositories/shipping-origins-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/db/database.types";

type ShippingOriginRow = Tables<"shipping_origins">;
type ShippingOriginInsert = TablesInsert<"shipping_origins">;
type ShippingOriginUpdate = TablesUpdate<"shipping_origins">;

export class ShippingOriginsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async get(): Promise<ShippingOriginRow | null> {
    const { data, error } = await this.supabase
      .from("shipping_origins")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      throw error;
    }

    return data;
  }

  async upsert(origin: ShippingOriginInsert): Promise<ShippingOriginRow> {
    const existing = await this.get();

    const { data, error } = await this.supabase
      .from("shipping_origins")
      .upsert(existing ? { ...origin, id: existing.id } : origin)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
