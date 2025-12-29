import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ShippingRepository } from "@/repositories/shipping-repo";
import type { ShippingProfileUpsert } from "@/types/views/shipping";

export class ShippingService {
  private repo: ShippingRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new ShippingRepository(supabase);
  }

  async getProfile(userId: string) {
    return this.repo.getByUserId(userId);
  }

  async upsertProfile(profile: ShippingProfileUpsert) {
    return this.repo.upsert(profile);
  }
}
