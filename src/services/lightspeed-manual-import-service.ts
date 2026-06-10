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
    let after: number | null = null;
    let hasNextPage = true;
    let safetyCounter = 0;
    const seenCursors = new Set<number>();

    while (hasNextPage && safetyCounter < 1000) {
      const result = await client.listProducts({ after, pageSize: 50 });

      for (const product of this.getTopLevelRemoteProducts(
        result.products as LightspeedRemoteProduct[],
      )) {
        scanned += 1;
        const fullProduct = (await client.getProduct(product.id)) ?? product;
        const syncResult = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: fullProduct,
          topic: "product.update",
          remoteModifiedAt: fullProduct.updated_at ?? new Date().toISOString(),
        });

        if (syncResult.status === "applied") {
          applied += 1;
        } else {
          skipped += 1;
        }
      }

      hasNextPage = result.hasNextPage;
      if (!hasNextPage) {
        break;
      }
      if (result.nextAfter === null || seenCursors.has(result.nextAfter)) {
        break;
      }
      seenCursors.add(result.nextAfter);
      after = result.nextAfter;
      safetyCounter += 1;
    }

    return {
      status: "completed" as const,
      scanned,
      applied,
      skipped,
    };
  }

  private getTopLevelRemoteProducts(products: LightspeedRemoteProduct[]) {
    return products.filter((product) => !product.variant_parent_id);
  }
}
