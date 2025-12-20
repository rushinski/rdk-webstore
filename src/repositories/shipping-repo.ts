// src/repositories/shipping-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

type ShippingProfileRow = Tables<"shipping_profiles">;
type ShippingProfileUpsert = TablesInsert<"shipping_profiles">;

export class ShippingRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByUserId(userId: string): Promise<ShippingProfileRow | null> {
    const { data, error } = await this.supabase
      .from("shipping_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsert(profile: ShippingProfileUpsert): Promise<ShippingProfileRow> {
    const { data, error } = await this.supabase
      .from("shipping_profiles")
      .upsert(profile, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    return data as ShippingProfileRow;
  }
}
