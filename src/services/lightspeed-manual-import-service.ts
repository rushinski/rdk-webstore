import { LightspeedClient } from "@/lib/lightspeed/client";
import type { LightspeedRemoteProduct } from "@/lib/lightspeed/types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedInboundSyncService } from "@/services/lightspeed-inbound-sync-service";

export class LightspeedManualImportService {
  private readonly settingsRepo: LightspeedSettingsRepository;
  private readonly inboundSyncService: LightspeedInboundSyncService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.settingsRepo = new LightspeedSettingsRepository(supabase);
    this.inboundSyncService = new LightspeedInboundSyncService(supabase);
  }

  async importProducts(input: { tenantId: string }) {
    const connection = await this.settingsRepo.getConnectionByTenant(input.tenantId);
    if (!connection.syncEnabled) {
      return { status: "skipped" as const, reason: "sync_disabled" as const };
    }

    if (!connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    const client = new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });

    let scanned = 0;
    let applied = 0;
    let skipped = 0;
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await client.listProducts(page, 50);

      for (const product of result.products as LightspeedRemoteProduct[]) {
        scanned += 1;
        const syncResult = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: product,
          topic: "product.update",
          remoteModifiedAt: product.updated_at ?? new Date().toISOString(),
        });

        if (syncResult.status === "applied") {
          applied += 1;
        } else {
          skipped += 1;
        }
      }

      hasNextPage = result.hasNextPage;
      page += 1;
    }

    return {
      status: "completed" as const,
      scanned,
      applied,
      skipped,
    };
  }
}
