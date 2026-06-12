import type { TypedSupabaseClient } from "@/lib/supabase/server";

type DeletedProductRecoveryRow = {
  id: string;
};

export class DeletedProductRecoveryRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async recordDeletion(input: {
    tenantId: string;
    productId: string | null;
    deletedByUserId?: string | null;
    deletedAt?: string;
    localProductSnapshot: unknown;
    lightspeedProductSnapshots: unknown[];
    links: unknown[];
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await this.supabase
      .from("deleted_product_recovery")
      .insert({
        tenant_id: input.tenantId,
        product_id: input.productId,
        deleted_by_user_id: input.deletedByUserId ?? null,
        deleted_at: input.deletedAt ?? new Date().toISOString(),
        local_product_snapshot: input.localProductSnapshot as never,
        lightspeed_product_snapshots: input.lightspeedProductSnapshots as never,
        lightspeed_link_snapshots: input.links as never,
        metadata: (input.metadata ?? {}) as never,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return data as DeletedProductRecoveryRow;
  }
}
