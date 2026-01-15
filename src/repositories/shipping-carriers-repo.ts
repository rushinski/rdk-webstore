// src/repositories/shipping-carriers-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/db/database.types";

type ShippingCarriersRow = Tables<"shipping_carriers">;
type ShippingCarriersInsert = TablesInsert<"shipping_carriers">;

export class ShippingCarriersRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async get(): Promise<ShippingCarriersRow | null> {
    // maybeSingle avoids throwing on "no rows"
    const { data, error } = await this.supabase
      .from("shipping_carriers")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async upsert(carriers: string[]): Promise<ShippingCarriersRow> {
    const existing = await this.get();

    // Only upsert the fields we actually want to write.
    // If your table has an `id`, re-use it so we update the same row.
    const payload: ShippingCarriersInsert = existing?.id
      ? ({ id: existing.id, enabled_carriers: carriers } as ShippingCarriersInsert)
      : ({ enabled_carriers: carriers } as ShippingCarriersInsert);

    const { data, error } = await this.supabase
      .from("shipping_carriers")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }
}
