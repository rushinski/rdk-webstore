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
    const rawProducts: LightspeedRemoteProduct[] = [];

    while (hasNextPage && safetyCounter < 1000) {
      const result = await client.listProducts({ after, pageSize: 50 });
      rawProducts.push(...(result.products as LightspeedRemoteProduct[]));

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

    for (const product of this.buildImportFamilies(rawProducts)) {
      scanned += 1;
      const fullProduct = await this.resolveImportPayload(client, product);
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

    return {
      status: "completed" as const,
      scanned,
      applied,
      skipped,
    };
  }

  private async resolveImportPayload(
    client: LightspeedClient,
    product: LightspeedRemoteProduct,
  ) {
    const fetched = (await client.getProduct(product.id)) ?? product;
    return this.mergeProductSnapshots(product, fetched);
  }

  private buildImportFamilies(products: LightspeedRemoteProduct[]) {
    const childRowsByParentId = new Map<string, LightspeedRemoteProduct[]>();

    for (const product of products) {
      const parentId = product.variant_parent_id?.trim();
      if (!parentId) {
        continue;
      }

      const existing = childRowsByParentId.get(parentId) ?? [];
      existing.push(product);
      childRowsByParentId.set(parentId, existing);
    }

    return products
      .filter((product) => !product.variant_parent_id)
      .map((product) => {
        const groupedChildren = childRowsByParentId.get(product.id) ?? [];
        if (groupedChildren.length === 0) {
          return product;
        }

        const existingVariants = Array.isArray(product.variants) ? product.variants : [];
        const existingVariantById = new Map(
          existingVariants.map((variant) => [variant.id, variant] as const),
        );

        return {
          ...product,
          variants: groupedChildren.map((child) => ({
            ...child,
            ...(existingVariantById.get(child.id) ?? {}),
          })),
        };
      });
  }

  private mergeProductSnapshots(
    seed: LightspeedRemoteProduct,
    fetched: LightspeedRemoteProduct,
  ): LightspeedRemoteProduct {
    const seedVariants = Array.isArray(seed.variants) ? seed.variants : [];
    const fetchedVariants = Array.isArray(fetched.variants) ? fetched.variants : [];

    if (seedVariants.length === 0 || fetchedVariants.length >= seedVariants.length) {
      return fetched;
    }

    const fetchedVariantById = new Map(
      fetchedVariants.map((variant) => [variant.id, variant] as const),
    );

    return {
      ...seed,
      ...fetched,
      variants: seedVariants.map((variant) => ({
        ...variant,
        ...(fetchedVariantById.get(variant.id) ?? {}),
      })),
    };
  }

  private getTopLevelRemoteProducts(products: LightspeedRemoteProduct[]) {
    return products.filter((product) => !product.variant_parent_id);
  }
}
