// src/repositories/shipping-carriers-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

type ShippingCarriersRow = Tables<"shipping_carriers">;
type ShippingCarriersInsert = TablesInsert<"shipping_carriers">;

export class ShippingCarriersRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async get(): Promise<ShippingCarriersRow | null> {
    const { data, error } = await this.supabase
      .from("shipping_carriers")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
    }
    
    return data;
  }

  async upsert(carriers: string[]): Promise<ShippingCarriersRow> {
    const existing = await this.get();
    
    const { data, error } = await this.supabase
      .from("shipping_carriers")
      .upsert(existing ? { ...existing, enabled_carriers: carriers } : { enabled_carriers: carriers })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}