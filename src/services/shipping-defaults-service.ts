// src/services/shipping-defaults-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";

export class ShippingDefaultsService {
  private repo: ShippingDefaultsRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new ShippingDefaultsRepository(supabase);
  }

  async list(tenantId?: string | null) {
    return this.repo.list(tenantId);
  }

  async upsertDefaults(
    tenantId: string | null,
    defaults: Array<{ category: string; default_price: number }>
  ) {
    return this.repo.upsertDefaults(tenantId, defaults);
  }
}
