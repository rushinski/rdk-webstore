import type { LightspeedLink } from "@/repositories/lightspeed-links-repo";
import type { ProductRepository } from "@/repositories/product-repo";
import type {
  LightspeedSyncRunItemInsert,
  LightspeedSyncRunSummary,
  LightspeedSyncRunsRepository,
} from "@/repositories/lightspeed-sync-runs-repo";
import type { ProductWithDetails } from "@/types/domain/product";

type PreviewGroupKey = keyof LightspeedSyncRunSummary;

export type LightspeedPreviewItem = {
  itemId?: string;
  changeType: PreviewGroupKey;
  action: string;
  entityType: "product" | "variant" | "link";
  entityKey: string;
  payload: Record<string, unknown>;
};

type PreviewGroups = Record<PreviewGroupKey, LightspeedPreviewItem[]>;

export class LightspeedSyncPreviewService {
  constructor(
    private readonly productRepo: Pick<ProductRepository, "list">,
    private readonly linksRepo: {
      listByTenant: (tenantId: string) => Promise<LightspeedLink[]>;
    },
    private readonly syncRunsRepo: Pick<
      LightspeedSyncRunsRepository,
      "createRun" | "createItems"
    >,
  ) {}

  async previewSync(input: {
    tenantId: string;
    startedBy: string | null;
    sourceOfTruth: "lightspeed_inventory" | "website_inventory";
  }) {
    const { products } = await this.productRepo.list({
      tenantId: input.tenantId,
      includeOutOfStock: true,
      searchMode: "inventory",
      page: 1,
      limit: 5000,
    });
    const links = await this.linksRepo.listByTenant(input.tenantId);

    const groups = this.buildGroups(products, links);
    const summary = this.buildSummary(groups);

    const run = await this.syncRunsRepo.createRun({
      tenantId: input.tenantId,
      startedBy: input.startedBy,
      sourceOfTruth: input.sourceOfTruth,
      status: "preview",
      summary,
    });

    const items = (Object.keys(groups) as PreviewGroupKey[]).flatMap((key) =>
      groups[key].map(
        (item): LightspeedSyncRunItemInsert => ({
          tenantId: input.tenantId,
          changeType: item.changeType,
          action: item.action,
          entityType: item.entityType,
          entityKey: item.entityKey,
          payload: item.payload,
        }),
      ),
    );
    const insertedItems = (await this.syncRunsRepo.createItems(run.id, items)) ?? [];
    const itemIdBySignature = new Map(
      insertedItems.map((item) => [
        `${item.change_type}:${item.entity_key}:${item.action}`,
        item.id,
      ]),
    );

    for (const key of Object.keys(groups) as PreviewGroupKey[]) {
      groups[key] = groups[key].map((item) => ({
        ...item,
        itemId:
          itemIdBySignature.get(`${item.changeType}:${item.entityKey}:${item.action}`) ??
          undefined,
      }));
    }

    return {
      syncRunId: run.id,
      summary,
      groups,
    };
  }

  private buildGroups(
    products: ProductWithDetails[],
    links: LightspeedLink[],
  ): PreviewGroups {
    const groups: PreviewGroups = {
      added: [],
      modified: [],
      archived: [],
      conflicts: [],
      skipped: [],
    };

    const productIds = new Set(products.map((product) => product.id));
    const linksByVariantId = new Map(
      links
        .filter((link) => link.variant_id)
        .map((link) => [link.variant_id as string, link]),
    );
    const linksByExternalSku = new Map<string, LightspeedLink[]>();
    for (const link of links) {
      const existing = linksByExternalSku.get(link.external_sku) ?? [];
      existing.push(link);
      linksByExternalSku.set(link.external_sku, existing);
    }

    for (const [externalSku, skuLinks] of linksByExternalSku.entries()) {
      if (skuLinks.length < 2) {
        continue;
      }

      groups.conflicts.push({
        changeType: "conflicts",
        action: "resolve_duplicate_link",
        entityType: "link",
        entityKey: externalSku,
        payload: {
          externalSku,
          linkIds: skuLinks.map((link) => link.id),
        },
      });
    }

    for (const product of products) {
      const hasLinkedVariant = product.variants.some((variant) =>
        linksByVariantId.has(variant.id),
      );

      if (!hasLinkedVariant) {
        groups.added.push({
          changeType: "added",
          action: "create_lightspeed_product",
          entityType: "product",
          entityKey: product.id,
          payload: {
            productId: product.id,
            sku: product.sku,
            title: product.title_display || product.title_raw,
          },
        });
      }
    }

    for (const link of links) {
      if (link.product_id && !productIds.has(link.product_id)) {
        groups.archived.push({
          changeType: "archived",
          action: "archive_lightspeed_product",
          entityType: "product",
          entityKey: link.product_id,
          payload: {
            productId: link.product_id,
            lightspeedProductId: link.lightspeed_product_id,
            externalSku: link.external_sku,
          },
        });
      }
    }

    return groups;
  }

  private buildSummary(groups: PreviewGroups): LightspeedSyncRunSummary {
    return {
      added: groups.added.length,
      modified: groups.modified.length,
      archived: groups.archived.length,
      conflicts: groups.conflicts.length,
      skipped: groups.skipped.length,
    };
  }
}
