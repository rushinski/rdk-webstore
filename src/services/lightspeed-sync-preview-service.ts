import type { LightspeedLink } from "@/repositories/lightspeed-links-repo";
import type { ProductRepository } from "@/repositories/product-repo";
import type {
  LightspeedSyncRunItemInsert,
  LightspeedSyncRunSummary,
  LightspeedSyncRunsRepository,
} from "@/repositories/lightspeed-sync-runs-repo";
import type { TitleParseResult } from "@/services/product-title-parser";
import { buildSizeTags } from "@/services/tag-service";
import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import type { Category, ProductWithDetails, SizeType } from "@/types/domain/product";

type PreviewGroupKey = keyof LightspeedSyncRunSummary;

type PreviewProductSnapshot = {
  title: string;
  imageUrl: string | null;
  condition: string;
  stock: number;
  priceCents: number | null;
  costCents: number | null;
  sku: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string | null;
  shippingCostCents: number | null;
  tags: Array<{ label: string; groupKey: string }>;
  variants: Array<{
    sizeLabel: string;
    priceCents: number | null;
    costCents: number | null;
    stock: number;
    sku: string;
  }>;
  status: "active" | "archived";
};

type ProjectedRemoteProduct = {
  remote: ReturnType<LightspeedMappingService["normalizeRemoteProducts"]>[number];
  parserResult: TitleParseResult | null;
  shippingCostCents: number | null;
  tags: Array<{ label: string; groupKey: string }>;
};

export type LightspeedPreviewItem = {
  itemId?: string;
  changeType: PreviewGroupKey;
  action: string;
  entityType: "product" | "variant" | "link";
  entityKey: string;
  payload: Record<string, unknown>;
};

type PreviewGroups = Record<PreviewGroupKey, LightspeedPreviewItem[]>;

type SyncPreviewSourceOfTruth =
  | "lightspeed_inventory"
  | "website_inventory"
  | "lightspeed_full_override"
  | "website_full_override";

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
    private readonly lightspeedReader?: {
      listProducts: (
        page?: number,
        pageSize?: number,
      ) => Promise<{
        products: unknown[];
        page: number;
        pageSize: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        totalProducts?: number | null;
        totalPages?: number | null;
      }>;
    },
    private readonly websiteProjection?: {
      parseTitle: (input: {
        titleRaw: string;
        category: Category;
        tenantId?: string | null;
      }) => Promise<TitleParseResult>;
      listShippingDefaults: (
        tenantId?: string | null,
      ) => Promise<Array<{ category: string; shipping_cost_cents: number }>>;
    },
  ) {}

  async previewSync(input: {
    tenantId: string;
    startedBy: string | null;
    sourceOfTruth: SyncPreviewSourceOfTruth;
    page: number;
    pageSize: number;
  }) {
    const { products } = await this.productRepo.list({
      tenantId: input.tenantId,
      includeOutOfStock: true,
      searchMode: "inventory",
      page: 1,
      limit: 5000,
    });
    const links = await this.linksRepo.listByTenant(input.tenantId);
    const remoteResult = await this.lightspeedReader
      ?.listProducts(input.page, input.pageSize)
      .catch(() => ({
        products: [],
        page: input.page,
        pageSize: input.pageSize,
        hasNextPage: false,
        hasPreviousPage: input.page > 1,
        totalProducts: 0,
        totalPages: 0,
      }));
    const allRemoteProducts = await this.fetchAllRemoteProducts(
      remoteResult ?? null,
      input.pageSize,
    );
    const groups = await this.buildGroups(
      products,
      links,
      input.sourceOfTruth,
      remoteResult?.products ?? [],
      input.page,
      input.tenantId,
    );
    const summary = this.buildSummary(groups);
    const totalGroups = await this.buildGroups(
      products,
      links,
      input.sourceOfTruth,
      allRemoteProducts,
      1,
      input.tenantId,
    );
    const totalSummary = this.buildSummary(totalGroups);
    const totalChangeCount =
      totalSummary.added +
      totalSummary.modified +
      totalSummary.archived +
      totalSummary.conflicts +
      totalSummary.skipped;

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
      pagination: {
        page: remoteResult?.page ?? input.page,
        pageSize: remoteResult?.pageSize ?? input.pageSize,
        hasNextPage: remoteResult?.hasNextPage ?? false,
        hasPreviousPage: remoteResult?.hasPreviousPage ?? input.page > 1,
        totalProducts: remoteResult?.totalProducts ?? allRemoteProducts.length,
        totalPages:
          remoteResult?.totalPages ??
          Math.max(
            1,
            Math.ceil(
              (remoteResult?.totalProducts ?? allRemoteProducts.length) / input.pageSize,
            ),
          ),
        totalGroupedItems: totalChangeCount,
        totalChanges: totalChangeCount,
      },
    };
  }

  private async buildGroups(
    products: ProductWithDetails[],
    links: LightspeedLink[],
    sourceOfTruth: SyncPreviewSourceOfTruth,
    remoteProducts: unknown[],
    page: number,
    tenantId: string,
  ): Promise<PreviewGroups> {
    const groups: PreviewGroups = {
      added: [],
      modified: [],
      archived: [],
      conflicts: [],
      skipped: [],
    };
    const mappingService = new LightspeedMappingService();
    const isLightspeedAuthoritative =
      sourceOfTruth === "lightspeed_inventory" ||
      sourceOfTruth === "lightspeed_full_override";
    const isWebsiteAuthoritative =
      sourceOfTruth === "website_inventory" || sourceOfTruth === "website_full_override";
    const isFullOverride =
      sourceOfTruth === "lightspeed_full_override" ||
      sourceOfTruth === "website_full_override";
    const normalizedRemote = mappingService.normalizeRemoteProducts(
      remoteProducts as Parameters<
        LightspeedMappingService["normalizeRemoteProducts"]
      >[0],
    );
    const projectedRemote = await this.projectRemoteProducts(normalizedRemote, tenantId);

    const productIds = new Set(products.map((product) => product.id));
    const productsById = new Map(products.map((product) => [product.id, product]));
    const productsBySku = new Map(products.map((product) => [product.sku, product]));
    const linksByVariantId = new Map(
      links
        .filter((link) => link.variant_id)
        .map((link) => [link.variant_id as string, link]),
    );
    const linksByLightspeedProductId = new Map<string, LightspeedLink[]>();
    const linksByExternalSku = new Map<string, LightspeedLink[]>();
    for (const link of links) {
      const existing = linksByExternalSku.get(link.external_sku) ?? [];
      existing.push(link);
      linksByExternalSku.set(link.external_sku, existing);

      if (link.lightspeed_product_id) {
        const byId = linksByLightspeedProductId.get(link.lightspeed_product_id) ?? [];
        byId.push(link);
        linksByLightspeedProductId.set(link.lightspeed_product_id, byId);
      }
    }
    const normalizedRemoteBySku = new Map(
      normalizedRemote.map((remote) => [remote.externalSku, remote]),
    );
    const remoteIds = new Set(
      normalizedRemote.map((remote) => remote.lightspeedProductId),
    );
    const groupedNewRemoteAdds = new Map<string, ProjectedRemoteProduct[]>();

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

    for (const projection of projectedRemote) {
      const remote = projection.remote;
      if (
        projection.parserResult &&
        (projection.parserResult.brand.confidence < 0.85 ||
          (this.toWebsiteCategory(remote.category) === "sneakers" &&
            projection.parserResult.model.confidence < 0.85))
      ) {
        groups.conflicts.push({
          changeType: "conflicts",
          action: "review_parser_resolution",
          entityType: "product",
          entityKey: remote.externalSku,
          payload: {
            externalSku: remote.externalSku,
            rawName: remote.rawName,
            cleanName: remote.cleanName,
            brandCandidate: projection.parserResult.brand,
            modelCandidate: projection.parserResult.model,
          },
        });
        continue;
      }

      const linkedBySku = linksByExternalSku.get(remote.externalSku) ?? [];
      const linkedByProductId =
        linksByLightspeedProductId.get(remote.lightspeedProductId) ?? [];
      const linkedRecord = linkedBySku[0] ?? linkedByProductId[0] ?? null;
      const localSkuMatch = productsBySku.get(remote.externalSku) ?? null;

      if (!linkedRecord && !localSkuMatch) {
        if (isLightspeedAuthoritative) {
          if (remote.condition === "new" && projection.parserResult) {
            const groupKey = this.buildRemoteGroupingKey(projection);
            const existing = groupedNewRemoteAdds.get(groupKey) ?? [];
            existing.push(projection);
            groupedNewRemoteAdds.set(groupKey, existing);
            continue;
          }

          groups.added.push({
            changeType: "added",
            action: "create_website_product",
            entityType: "product",
            entityKey: remote.externalSku,
            payload: {
              lightspeedProductId: remote.lightspeedProductId,
              externalSku: remote.externalSku,
              rawName: remote.rawName,
              cleanName: remote.cleanName,
              description: remote.description,
              condition: remote.condition,
              sizeLabel: remote.sizeLabel,
              stock: remote.stock,
              brand: remote.brand,
              model: projection.parserResult?.model.label ?? remote.model,
              category: remote.category,
              imageUrls: remote.imageUrls,
              preview: {
                current: null,
                proposed: this.buildRemoteSnapshot(remote, projection),
              },
            },
          });
        } else if (isFullOverride) {
          groups.archived.push({
            changeType: "archived",
            action: "archive_lightspeed_product",
            entityType: "product",
            entityKey: remote.externalSku,
            payload: {
              lightspeedProductId: remote.lightspeedProductId,
              externalSku: remote.externalSku,
              preview: {
                current: this.buildRemoteSnapshot(remote, projection),
                proposed: null,
              },
            },
          });
        }
        continue;
      }

      if (!linkedRecord) {
        continue;
      }

      if (!linkedRecord.variant_id) {
        continue;
      }

      const localProduct = linkedRecord.product_id
        ? productsById.get(linkedRecord.product_id)
        : null;
      const localVariant = localProduct?.variants.find(
        (variant) => variant.id === linkedRecord.variant_id,
      );
      if (!localProduct || !localVariant) {
        continue;
      }

      if (localVariant.stock !== remote.stock) {
        groups.modified.push({
          changeType: "modified",
          action: isLightspeedAuthoritative
            ? "update_website_inventory"
            : "update_lightspeed_inventory",
          entityType: "variant",
          entityKey: localVariant.id,
          payload: {
            productId: localProduct.id,
            variantId: localVariant.id,
            externalSku: remote.externalSku,
            websiteStock: localVariant.stock,
            lightspeedStock: remote.stock,
            preview: {
              current: this.buildWebsiteSnapshot(localProduct, localVariant, {
                stock: localVariant.stock,
              }),
              proposed: this.buildWebsiteSnapshot(localProduct, localVariant, {
                stock: isLightspeedAuthoritative ? remote.stock : localVariant.stock,
              }),
            },
          },
        });
      }

      const localName = (
        localProduct.title_display ||
        localProduct.title_raw ||
        ""
      ).trim();
      if (
        isFullOverride &&
        isLightspeedAuthoritative &&
        remote.cleanName &&
        localName &&
        localName !== remote.cleanName
      ) {
        groups.modified.push({
          changeType: "modified",
          action: "normalize_website_product",
          entityType: "product",
          entityKey: localProduct.id,
          payload: {
            productId: localProduct.id,
            currentTitle: localName,
            normalizedTitle: remote.cleanName,
            lightspeedProductId: remote.lightspeedProductId,
            preview: {
              current: this.buildWebsiteSnapshot(localProduct, localVariant),
              proposed: this.buildWebsiteSnapshot(localProduct, localVariant, {
                title: remote.cleanName,
                description: remote.description,
                condition: remote.condition,
                imageUrl: remote.imageUrls[0] ?? this.getPrimaryImageUrl(localProduct),
                brand: projection.parserResult?.brand.label ?? remote.brand,
                model: projection.parserResult?.model.label ?? remote.model,
                priceCents: remote.priceCents,
                costCents: remote.costCents,
                shippingCostCents: projection.shippingCostCents,
                tags: projection.tags,
                variants: [
                  {
                    sizeLabel: remote.sizeLabel,
                    priceCents: remote.priceCents,
                    costCents: remote.costCents,
                    stock: remote.stock,
                    sku: remote.externalSku,
                  },
                ],
              }),
            },
          },
        });
      }
    }

    for (const [groupKey, projections] of groupedNewRemoteAdds.entries()) {
      const first = projections[0];
      if (!first) {
        continue;
      }

      groups.added.push({
        changeType: "added",
        action: "create_website_product",
        entityType: "product",
        entityKey: groupKey,
        payload: {
          lightspeedProductIds: projections.map(
            (projection) => projection.remote.lightspeedProductId,
          ),
          externalSkus: projections.map((projection) => projection.remote.externalSku),
          rawNames: projections.map((projection) => projection.remote.rawName),
          cleanName: first.remote.cleanName,
          description: first.remote.description,
          condition: first.remote.condition,
          brand: first.parserResult?.brand.label ?? first.remote.brand,
          model: first.parserResult?.model.label ?? first.remote.model,
          category: first.remote.category,
          imageUrls: projections.flatMap((projection) => projection.remote.imageUrls),
          preview: {
            current: null,
            proposed: this.buildGroupedRemoteSnapshot(projections),
          },
        },
      });
    }

    if (page === 1) {
      for (const product of products) {
        const hasLinkedVariant = product.variants.some((variant) =>
          linksByVariantId.has(variant.id),
        );

        if (!hasLinkedVariant && !normalizedRemoteBySku.has(product.sku)) {
          if (isWebsiteAuthoritative) {
            groups.added.push({
              changeType: "added",
              action: "create_lightspeed_product",
              entityType: "product",
              entityKey: product.id,
              payload: {
                productId: product.id,
                sku: product.sku,
                title: product.title_display || product.title_raw,
                preview: {
                  current: this.buildWebsiteSnapshot(
                    product,
                    product.variants[0] ?? null,
                  ),
                  proposed: null,
                },
              },
            });
          } else if (isFullOverride) {
            groups.archived.push({
              changeType: "archived",
              action: "archive_website_product",
              entityType: "product",
              entityKey: product.id,
              payload: {
                productId: product.id,
                sku: product.sku,
                preview: {
                  current: this.buildWebsiteSnapshot(
                    product,
                    product.variants[0] ?? null,
                  ),
                  proposed: null,
                },
              },
            });
          }
        }
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
            preview: {
              current: this.buildArchivedSnapshotFromLocal(link.product_id, productsById),
              proposed: null,
            },
          },
        });
        continue;
      }

      if (
        link.product_id &&
        link.lightspeed_product_id &&
        !normalizedRemoteBySku.has(link.external_sku) &&
        !remoteIds.has(link.lightspeed_product_id)
      ) {
        if (isLightspeedAuthoritative && isFullOverride) {
          groups.archived.push({
            changeType: "archived",
            action: "archive_website_product",
            entityType: "product",
            entityKey: link.product_id,
            payload: {
              productId: link.product_id,
              lightspeedProductId: link.lightspeed_product_id,
              externalSku: link.external_sku,
              preview: {
                current: this.buildArchivedSnapshotFromLocal(
                  link.product_id,
                  productsById,
                ),
                proposed: null,
              },
            },
          });
        }
      }
    }

    return groups;
  }

  private async fetchAllRemoteProducts(
    firstPage: {
      products: unknown[];
      page: number;
      pageSize: number;
      hasNextPage: boolean;
      totalPages?: number | null;
    } | null,
    pageSize: number,
  ) {
    if (!this.lightspeedReader || !firstPage) {
      return [];
    }

    const products = [...firstPage.products];
    const totalPages = firstPage.totalPages ?? null;
    let nextPage = firstPage.page + 1;

    while (
      firstPage.hasNextPage &&
      (typeof totalPages === "number" ? nextPage <= totalPages : true)
    ) {
      const result = await this.lightspeedReader.listProducts(nextPage, pageSize);
      products.push(...result.products);

      if (!result.hasNextPage) {
        break;
      }

      nextPage += 1;
    }

    return products;
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

  private buildWebsiteSnapshot(
    product: ProductWithDetails,
    variant: ProductWithDetails["variants"][number] | null,
    overrides?: Partial<PreviewProductSnapshot>,
  ): PreviewProductSnapshot {
    const base: PreviewProductSnapshot = {
      title: (product.title_display || product.title_raw || product.name || "").trim(),
      imageUrl: this.getPrimaryImageUrl(product),
      condition: product.condition,
      stock: variant?.stock ?? 0,
      priceCents: variant?.price_cents ?? null,
      costCents: variant?.cost_cents ?? null,
      sku: product.sku,
      brand: product.brand ?? null,
      model: product.model ?? null,
      category: product.category ?? null,
      description: product.description ?? null,
      shippingCostCents:
        product.shipping_override_cents ??
        (typeof product.default_shipping_price === "number"
          ? Math.round(product.default_shipping_price * 100)
          : null),
      tags: product.tags.map((tag) => ({
        label: tag.label,
        groupKey: tag.group_key,
      })),
      variants: product.variants.map((entry) => ({
        sizeLabel: entry.size_label,
        priceCents: entry.price_cents ?? null,
        costCents: entry.cost_cents ?? null,
        stock: entry.stock ?? 0,
        sku: product.sku,
      })),
      status: product.is_active ? "active" : "archived",
    };

    return {
      ...base,
      ...overrides,
    };
  }

  private buildRemoteSnapshot(
    remote: {
      cleanName: string;
      imageUrls: string[];
      condition: string;
      sizeLabel: string;
      stock: number;
      externalSku: string;
      brand: string | null;
      model: string | null;
      category: string | null;
      description: string | null;
      isActive: boolean;
      priceCents: number | null;
      costCents: number | null;
    },
    projection?: Pick<
      ProjectedRemoteProduct,
      "parserResult" | "shippingCostCents" | "tags"
    >,
  ): PreviewProductSnapshot {
    return {
      title: projection?.parserResult?.titleDisplay ?? remote.cleanName,
      imageUrl: remote.imageUrls[0] ?? null,
      condition: remote.condition,
      stock: remote.stock,
      priceCents: remote.priceCents,
      costCents: remote.costCents,
      sku: remote.externalSku,
      brand: projection?.parserResult?.brand.label ?? remote.brand,
      model: projection?.parserResult?.model.label ?? remote.model,
      category: remote.category,
      description: remote.description,
      shippingCostCents: projection?.shippingCostCents ?? null,
      tags: projection?.tags ?? [],
      variants: [
        {
          sizeLabel: remote.sizeLabel,
          priceCents: remote.priceCents,
          costCents: remote.costCents,
          stock: remote.stock,
          sku: remote.externalSku,
        },
      ],
      status: remote.isActive ? "active" : "archived",
    };
  }

  private buildArchivedSnapshotFromLocal(
    productId: string,
    productsById: Map<string, ProductWithDetails>,
  ) {
    const product = productsById.get(productId);
    if (!product) {
      return null;
    }

    return this.buildWebsiteSnapshot(product, product.variants[0] ?? null, {
      status: "archived",
    });
  }

  private getPrimaryImageUrl(product: ProductWithDetails) {
    const primary =
      product.images.find((image) => image.is_primary) ?? product.images[0] ?? null;
    return primary?.url ?? null;
  }

  private buildRemoteGroupingKey(projection: ProjectedRemoteProduct) {
    const parsed = projection.parserResult;
    const remote = projection.remote;

    return [
      parsed?.brand.label ?? remote.brand ?? "unknown",
      parsed?.model.label ?? remote.model ?? remote.cleanName,
      remote.category ?? "unknown",
      remote.condition,
    ]
      .map((value) => value.trim().toLowerCase())
      .join(":");
  }

  private buildGroupedRemoteSnapshot(
    projections: ProjectedRemoteProduct[],
  ): PreviewProductSnapshot {
    const first = projections[0];
    const firstRemote = first.remote;
    const firstParser = first.parserResult;

    const variants = projections.map((projection) => ({
      sizeLabel: projection.remote.sizeLabel,
      priceCents: projection.remote.priceCents,
      costCents: projection.remote.costCents,
      stock: projection.remote.stock,
      sku: projection.remote.externalSku,
    }));

    return {
      title: firstParser?.titleDisplay ?? firstRemote.cleanName,
      imageUrl:
        projections.flatMap((projection) => projection.remote.imageUrls)[0] ?? null,
      condition: firstRemote.condition,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      priceCents: firstRemote.priceCents,
      costCents: firstRemote.costCents,
      sku: firstRemote.externalSku,
      brand: firstParser?.brand.label ?? firstRemote.brand,
      model: firstParser?.model.label ?? firstRemote.model,
      category: firstRemote.category,
      description: firstRemote.description,
      shippingCostCents: first.shippingCostCents,
      tags: first.tags,
      variants,
      status: firstRemote.isActive ? "active" : "archived",
    };
  }

  private async projectRemoteProducts(
    normalizedRemote: ReturnType<LightspeedMappingService["normalizeRemoteProducts"]>,
    tenantId: string,
  ): Promise<ProjectedRemoteProduct[]> {
    if (!this.websiteProjection) {
      return normalizedRemote.map((remote) => ({
        remote,
        parserResult: null,
        shippingCostCents: null,
        tags: [],
      }));
    }

    const shippingDefaults = await this.websiteProjection.listShippingDefaults(tenantId);

    return Promise.all(
      normalizedRemote.map(async (remote) => {
        const category = this.toWebsiteCategory(remote.category);
        const parserResult = await this.websiteProjection!.parseTitle({
          titleRaw: remote.cleanName,
          category,
          tenantId,
        });
        const shippingCostCents =
          shippingDefaults.find((entry) => entry.category === category)
            ?.shipping_cost_cents ?? null;
        const tags = buildSizeTags([
          {
            size_type: this.inferSizeType(remote.sizeLabel),
            size_label: remote.sizeLabel,
            stock: remote.stock,
          },
        ]).map((tag) => ({
          label: tag.label,
          groupKey: tag.group_key,
        }));

        return {
          remote: {
            ...remote,
            brand: parserResult.brand.label || remote.brand,
            model: parserResult.model.label ?? remote.model,
          },
          parserResult,
          shippingCostCents,
          tags,
        };
      }),
    );
  }

  private toWebsiteCategory(category: string | null): Category {
    const normalized = category?.trim().toLowerCase() ?? "";
    if (normalized.includes("cloth")) {
      return "clothing";
    }
    if (normalized.includes("access")) {
      return "accessories";
    }
    if (normalized.includes("elect")) {
      return "electronics";
    }
    return "sneakers";
  }

  private inferSizeType(sizeLabel: string): SizeType {
    const normalized = sizeLabel.trim().toUpperCase();
    if (/^\d/.test(normalized) || /W$/.test(normalized) || /M/.test(normalized)) {
      return "shoe";
    }
    if (
      ["XS", "S", "SMALL", "M", "MEDIUM", "L", "LARGE", "XL", "XXL"].includes(normalized)
    ) {
      return "clothing";
    }
    return "custom";
  }
}
