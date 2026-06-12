import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

type DeletedProductRecoveryRow = {
  id: string;
};

export class DeletedProductRecoveryRepository {
  private readonly writeClient: TypedSupabaseClient;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    writeClient?: TypedSupabaseClient,
  ) {
    this.writeClient =
      writeClient ?? (createSupabaseAdminClient() as TypedSupabaseClient);
  }

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
    const { data, error } = await this.writeClient
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

    // Deletes fail closed: if recovery capture cannot be persisted, the caller
    // must stop before remote Lightspeed delete.
    if (error) {
      throw error;
    }

    return data as DeletedProductRecoveryRow;
  }
}
