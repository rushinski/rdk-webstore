// src/repositories/shipping-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ShippingProfile } from "@/types/product";

export class ShippingRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByUserId(userId: string): Promise<ShippingProfile | null> {
    const { data, error } = await this.supabase
      .from('shipping_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsert(profile: ShippingProfile) {
    const { data, error } = await this.supabase
      .from('shipping_profiles')
      .upsert(profile, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data as ShippingProfile;
  }
}