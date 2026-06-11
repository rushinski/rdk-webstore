import { LightspeedClient } from "@/lib/lightspeed/client";
import type { LightspeedRemoteProduct } from "@/lib/lightspeed/types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  LightspeedLinksRepository,
  type LightspeedLink,
} from "@/repositories/lightspeed-links-repo";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { ProductRepository, type ProductWithDetails } from "@/repositories/product-repo";
import { LightspeedInboundSyncService } from "@/services/lightspeed-inbound-sync-service";
import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { ProductService } from "@/services/product-service";
import { buildAutoProductTags } from "@/services/tag-service";
import type { SizeType } from "@/types/domain/product";

type ReconciliationMatchReason = "link" | "sku";

export type ReconciliationComparableVariant = {
  sku: string;
  sizeLabel: string;
  salePriceCents: number;
  unitCostCents: number;
  stock: number;
  sortOrder: number;
};

export type ReconciliationComparableTag = {
  label: string;
  groupKey: string;
};

export type ReconciliationComparableProduct = {
  title: string;
  rowCreatedAt: string | null;
  productCreatedAt: string | null;
  productUpdatedAt: string | null;
  description: string | null;
  brand: string;
  model: string | null;
  category: string;
  condition: string;
  sizeType: string;
  isActive: boolean;
  isOutOfStock: boolean;
  imageUrls: string[];
  tags: ReconciliationComparableTag[];
  variants: ReconciliationComparableVariant[];
};

export type ReconciliationDiff = {
  fields: string[];
  variantChanges: Array<{
    sku: string;
    fields: string[];
    changeType: "added" | "removed" | "changed";
  }>;
};

export type LightspeedReconciliationPreview = {
  noChangeCount: number;
  importCount: number;
  editCount: number;
  restoreCount: number;
  archiveCount: number;
  conflictCount: number;
  noChanges: Array<{
    websiteProductId: string;
    remoteProductId: string;
    reason: ReconciliationMatchReason;
    skuMatches: string[];
    title: string;
  }>;
  edits: Array<{
    websiteProductId: string;
    remoteProductId: string;
    reason: ReconciliationMatchReason;
    skuMatches: string[];
    title: string;
    website: ReconciliationComparableProduct;
    remote: ReconciliationComparableProduct;
    diff: ReconciliationDiff;
  }>;
  imports: Array<{
    remoteProductId: string;
    title: string;
    skuSample: string | null;
    remote: ReconciliationComparableProduct;
  }>;
  restores: Array<{
    websiteProductId: string;
    remoteProductId: string;
    title: string;
    skuSample: string | null;
    reason: ReconciliationMatchReason;
    website: ReconciliationComparableProduct;
    remote: ReconciliationComparableProduct;
    diff: ReconciliationDiff | null;
  }>;
  archives: Array<{
    websiteProductId: string;
    title: string;
    skuSample: string | null;
    website: ReconciliationComparableProduct;
  }>;
  conflicts: Array<{
    remoteProductId: string;
    title: string;
    candidateWebsiteProductIds: string[];
    skuMatches: string[];
    remote: ReconciliationComparableProduct;
  }>;
};

export type LightspeedReconciliationApplyResult = {
  noChangeCount: number;
  importedCount: number;
  editedCount: number;
  restoredCount: number;
  archivedCount: number;
  conflictCount: number;
  failedCount: number;
};

export type LightspeedReconciliationChunkResult = {
  importedCount?: number;
  editedCount?: number;
  restoredCount?: number;
  archivedCount?: number;
  failedCount: number;
};

export type LightspeedReconciliationWebsiteCandidate = {
  websiteProductId: string;
  title: string;
  skuSample: string | null;
  website: ReconciliationComparableProduct;
};

export type LightspeedReconciliationPreviewScanResult = {
  chunkIndex: number;
  after: number | null;
  nextAfter: number | null;
  pageSize: number;
  processedCount: number;
  totalRemoteProducts: number | null;
  hasNextPage: boolean;
  nextPage: number | null;
  preview: Omit<LightspeedReconciliationPreview, "archives" | "archiveCount"> & {
    archiveCount: 0;
    archives: [];
  };
  websiteCandidates: LightspeedReconciliationWebsiteCandidate[];
};

export class LightspeedReconciliationSyncService {
  private readonly settingsRepo: LightspeedSettingsRepository;
  private readonly productRepo: ProductRepository;
  private readonly linksRepo: LightspeedLinksRepository;
  private readonly inboundSyncService: LightspeedInboundSyncService;
  private readonly productService: ProductService;
  private readonly mappingService: LightspeedMappingService;
  private readonly parserService: ProductTitleParserService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.settingsRepo = new LightspeedSettingsRepository(supabase);
    this.productRepo = new ProductRepository(supabase);
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.inboundSyncService = new LightspeedInboundSyncService(supabase);
    this.productService = new ProductService(supabase);
    this.mappingService = new LightspeedMappingService();
    this.parserService = new ProductTitleParserService(supabase);
  }

  async preview(input: { tenantId: string }): Promise<LightspeedReconciliationPreview> {
    const client = await this.getClient(input.tenantId);
    const [remoteProducts, websiteProducts, archivedWebsiteProducts, links] =
      await Promise.all([
        this.listAllRemoteProducts(client),
        this.productRepo.listForReconciliation(input.tenantId, "active"),
        this.productRepo.listForReconciliation(input.tenantId, "archived"),
        this.linksRepo.listByTenant(input.tenantId),
      ]);

    const classification = await this.classifyRemoteProducts({
      tenantId: input.tenantId,
      remoteProducts,
      activeWebsiteProducts: websiteProducts,
      archivedWebsiteProducts,
      links,
    });

    const archives = websiteProducts
      .filter(
        (product) =>
          !classification.matchedWebsiteProductIds.has(product.id) &&
          !classification.conflictWebsiteProductIds.has(product.id),
      )
      .map((product) => ({
        websiteProductId: product.id,
        title: product.name,
        skuSample: product.variants[0]?.sku ?? null,
        website: this.toComparableWebsiteProduct(product),
      }));

    return {
      noChangeCount: classification.noChanges.length,
      importCount: classification.imports.length,
      editCount: classification.edits.length,
      restoreCount: classification.restores.length,
      archiveCount: archives.length,
      conflictCount: classification.conflicts.length,
      noChanges: classification.noChanges,
      edits: classification.edits,
      imports: classification.imports,
      restores: classification.restores,
      archives,
      conflicts: classification.conflicts,
    };
  }

  async scanPreviewChunk(input: {
    tenantId: string;
    after: number | null;
    pageSize: number;
    chunkIndex: number;
  }): Promise<LightspeedReconciliationPreviewScanResult> {
    const client = await this.getClient(input.tenantId);
    const [pageResult, websiteProducts, archivedWebsiteProducts, links] = await Promise.all([
      client.listProducts({
        after: input.after,
        pageSize: input.pageSize,
      }),
      this.productRepo.listForReconciliation(input.tenantId, "active"),
      this.productRepo.listForReconciliation(input.tenantId, "archived"),
      this.linksRepo.listByTenant(input.tenantId),
    ]);

    const topLevelProducts = this.getTopLevelRemoteProducts(pageResult.products);
    const hydratedRemoteProducts = await Promise.all(
      topLevelProducts.map(async (product) => {
        try {
          return (await client.getProduct(product.id)) ?? product;
        } catch {
          return product;
        }
      }),
    );

    const classification = await this.classifyRemoteProducts({
      tenantId: input.tenantId,
      remoteProducts: hydratedRemoteProducts,
      activeWebsiteProducts: websiteProducts,
      archivedWebsiteProducts,
      links,
    });

    return {
      chunkIndex: input.chunkIndex,
      after: input.after,
      nextAfter: pageResult.hasNextPage ? pageResult.nextAfter : null,
      pageSize: input.pageSize,
      processedCount:
        hydratedRemoteProducts.length,
      totalRemoteProducts: pageResult.totalProducts ?? null,
      hasNextPage: pageResult.hasNextPage,
      nextPage: pageResult.hasNextPage ? input.chunkIndex + 1 : null,
      preview: {
        noChangeCount: classification.noChanges.length,
        importCount: classification.imports.length,
        editCount: classification.edits.length,
        restoreCount: classification.restores.length,
        archiveCount: 0,
        conflictCount: classification.conflicts.length,
        noChanges: classification.noChanges,
        edits: classification.edits,
        imports: classification.imports,
        restores: classification.restores,
        archives: [],
        conflicts: classification.conflicts,
      },
      websiteCandidates: websiteProducts.map((product) => ({
        websiteProductId: product.id,
        title: product.name,
        skuSample: product.variants[0]?.sku ?? null,
        website: this.toComparableWebsiteProduct(product),
      })),
    };
  }

  async apply(input: { tenantId: string }): Promise<LightspeedReconciliationApplyResult> {
    const preview = await this.preview(input);
    let importedCount = 0;
    let editedCount = 0;
    let restoredCount = 0;
    let archivedCount = 0;
    let failedCount = 0;

    for (const match of preview.edits.filter((item) => item.reason === "sku")) {
      try {
        const remoteProduct = await this.getClient(input.tenantId).then((client) =>
          client.getProduct(match.remoteProductId),
        );
        if (!remoteProduct) {
          failedCount += 1;
          continue;
        }

        await this.attachSkuFallbackLinks(
          input.tenantId,
          match.websiteProductId,
          remoteProduct,
          remoteProduct.updated_at ?? new Date().toISOString(),
        );

        await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
        });
        editedCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    const restoreResult = await this.applyRestoreChunk({
      tenantId: input.tenantId,
      restores: preview.restores,
    });
    restoredCount += restoreResult.restoredCount ?? 0;
    failedCount += restoreResult.failedCount;

    const importResult = await this.applyImportChunk({
      tenantId: input.tenantId,
      remoteProductIds: preview.imports.map((item) => item.remoteProductId),
    });
    importedCount += importResult.importedCount ?? 0;
    failedCount += importResult.failedCount;

    const editResult = await this.applyEditChunk({
      tenantId: input.tenantId,
      edits: preview.edits.filter((item) => item.reason === "link"),
    });
    editedCount += editResult.editedCount ?? 0;
    failedCount += editResult.failedCount;

    const archiveResult = await this.applyArchiveChunk({
      tenantId: input.tenantId,
      websiteProductIds: preview.archives.map((item) => item.websiteProductId),
    });
    archivedCount += archiveResult.archivedCount ?? 0;
    failedCount += archiveResult.failedCount;

    return {
      noChangeCount: preview.noChangeCount,
      importedCount,
      editedCount,
      restoredCount,
      archivedCount,
      conflictCount: preview.conflictCount,
      failedCount,
    };
  }

  async applyImportChunk(input: {
    tenantId: string;
    remoteProductIds: string[];
  }): Promise<LightspeedReconciliationChunkResult> {
    const client = await this.getClient(input.tenantId);
    const archivedWebsiteProducts =
      (await this.productRepo.listForReconciliation(input.tenantId, "archived")) ?? [];
    const archivedWebsiteProductById = new Map(
      archivedWebsiteProducts.map((product) => [product.id, product] as const),
    );
    const archivedSkuIndex = this.buildWebsiteSkuIndex(archivedWebsiteProducts, new Set());
    let importedCount = 0;
    let failedCount = 0;

    for (const remoteProductId of input.remoteProductIds) {
      try {
        const remoteProduct = await client.getProduct(remoteProductId);
        if (!remoteProduct) {
          failedCount += 1;
          continue;
        }

        const result = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
        });

        if (result.status === "applied") {
          importedCount += 1;
          continue;
        }

        const archivedFallback = this.findSingleArchivedSkuCandidate(
          remoteProduct,
          archivedSkuIndex,
        );
        if (!archivedFallback) {
          failedCount += 1;
          continue;
        }

        const archivedProduct = archivedWebsiteProductById.get(archivedFallback);
        if (!archivedProduct) {
          failedCount += 1;
          continue;
        }

        await this.productService.restoreProduct(archivedProduct.id, input.tenantId);
        await this.attachSkuFallbackLinks(
          input.tenantId,
          archivedProduct.id,
          remoteProduct,
          remoteProduct.updated_at ?? new Date().toISOString(),
        );

        const restoredResult = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
        });

        if (restoredResult.status === "applied") {
          importedCount += 1;
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    return {
      importedCount,
      failedCount,
    };
  }

  async applyEditChunk(input: {
    tenantId: string;
    edits: Array<{
      websiteProductId: string;
      remoteProductId: string;
      reason?: ReconciliationMatchReason;
    }>;
  }): Promise<LightspeedReconciliationChunkResult> {
    const client = await this.getClient(input.tenantId);
    let editedCount = 0;
    let failedCount = 0;

    for (const edit of input.edits) {
      try {
        const remoteProduct = await client.getProduct(edit.remoteProductId);
        if (!remoteProduct) {
          failedCount += 1;
          continue;
        }

        if (edit.reason === "sku") {
          await this.attachSkuFallbackLinks(
            input.tenantId,
            edit.websiteProductId,
            remoteProduct,
            remoteProduct.updated_at ?? new Date().toISOString(),
          );
        }

        const result = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
        });

        if (result.status === "applied") {
          editedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    return {
      editedCount,
      failedCount,
    };
  }

  async applyArchiveChunk(input: {
    tenantId: string;
    websiteProductIds: string[];
  }): Promise<LightspeedReconciliationChunkResult> {
    let archivedCount = 0;
    let failedCount = 0;

    for (const websiteProductId of input.websiteProductIds) {
      try {
        const result = await this.productService.archiveProduct(
          websiteProductId,
          input.tenantId,
        );
        if (result.archived) {
          archivedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    return {
      archivedCount,
      failedCount,
    };
  }

  async applyRestoreChunk(input: {
    tenantId: string;
    restores: Array<{
      websiteProductId: string;
      remoteProductId: string;
      reason?: ReconciliationMatchReason;
    }>;
  }): Promise<LightspeedReconciliationChunkResult> {
    const client = await this.getClient(input.tenantId);
    let restoredCount = 0;
    let failedCount = 0;

    for (const restore of input.restores) {
      try {
        const remoteProduct = await client.getProduct(restore.remoteProductId);
        if (!remoteProduct) {
          failedCount += 1;
          continue;
        }

        await this.productService.restoreProduct(restore.websiteProductId, input.tenantId);

        if (restore.reason === "sku") {
          await this.attachSkuFallbackLinks(
            input.tenantId,
            restore.websiteProductId,
            remoteProduct,
            remoteProduct.updated_at ?? new Date().toISOString(),
          );
        }

        const result = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
        });

        if (result.status === "applied") {
          restoredCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    return {
      restoredCount,
      failedCount,
    };
  }

  private async getClient(tenantId: string) {
    const connection = await this.settingsRepo.getConnectionByTenant(tenantId);
    if (!connection.syncEnabled || !connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    return new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });
  }

  private async listAllRemoteProducts(client: LightspeedClient) {
    const products: LightspeedRemoteProduct[] = [];
    let after: number | null = null;
    let hasNextPage = true;
    let safetyCounter = 0;
    const seenCursors = new Set<number>();

    while (hasNextPage && safetyCounter < 1000) {
      const result = await client.listProducts({ after, pageSize: 50 });
      products.push(...this.getTopLevelRemoteProducts(result.products));
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

    return products;
  }

  private getTopLevelRemoteProducts(products: LightspeedRemoteProduct[]) {
    return products.filter((product) => !product.variant_parent_id);
  }

  private async classifyRemoteProducts(input: {
    tenantId: string;
    remoteProducts: LightspeedRemoteProduct[];
    activeWebsiteProducts: ProductWithDetails[];
    archivedWebsiteProducts: ProductWithDetails[];
    links: LightspeedLink[];
  }) {
    const activeLinks = input.links.filter(
      (link) => !link.tombstoned_at && link.product_id,
    );
    const linkByRemoteId = this.buildLinkIndex(activeLinks);
    const activeWebsiteProductIds = new Set(
      input.activeWebsiteProducts.map((product) => product.id),
    );
    const archivedWebsiteProductIds = new Set(
      input.archivedWebsiteProducts.map((product) => product.id),
    );
    const linkedActiveWebsiteProductIds = new Set(
      activeLinks
        .map((link) => link.product_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && activeWebsiteProductIds.has(value),
        ),
    );
    const linkedArchivedWebsiteProductIds = new Set(
      activeLinks
        .map((link) => link.product_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && archivedWebsiteProductIds.has(value),
        ),
    );
    const activeSkuIndex = this.buildWebsiteSkuIndex(
      input.activeWebsiteProducts,
      linkedActiveWebsiteProductIds,
    );
    const archivedSkuIndex = this.buildWebsiteSkuIndex(
      input.archivedWebsiteProducts,
      linkedArchivedWebsiteProductIds,
    );

    const activeWebsiteProductById = new Map(
      input.activeWebsiteProducts.map((product) => [product.id, product] as const),
    );
    const archivedWebsiteProductById = new Map(
      input.archivedWebsiteProducts.map((product) => [product.id, product] as const),
    );

    const noChanges: LightspeedReconciliationPreview["noChanges"] = [];
    const edits: LightspeedReconciliationPreview["edits"] = [];
    const imports: LightspeedReconciliationPreview["imports"] = [];
    const restores: LightspeedReconciliationPreview["restores"] = [];
    const conflicts: LightspeedReconciliationPreview["conflicts"] = [];
    const matchedWebsiteProductIds = new Set<string>();
    const conflictWebsiteProductIds = new Set<string>();

    for (const remoteProduct of input.remoteProducts) {
      const normalizedVariants = this.mappingService.normalizeRemoteProducts([
        remoteProduct,
      ]);
      const remoteIds = new Set<string>([
        remoteProduct.id,
        ...normalizedVariants
          .map((variant) => variant.lightspeedProductId)
          .filter(Boolean),
      ]);

      const linkedActiveProductIds = new Set<string>();
      const linkedArchivedProductIds = new Set<string>();
      for (const remoteId of remoteIds) {
        const linked = linkByRemoteId.get(remoteId);
        if (linked?.product_id) {
          if (activeWebsiteProductIds.has(linked.product_id)) {
            linkedActiveProductIds.add(linked.product_id);
          } else if (archivedWebsiteProductIds.has(linked.product_id)) {
            linkedArchivedProductIds.add(linked.product_id);
          }
        }
      }

      const remoteComparable = await this.toComparableRemoteProduct(
        input.tenantId,
        remoteProduct,
      );

      if (linkedActiveProductIds.size === 1 && linkedArchivedProductIds.size === 0) {
        const websiteProductId = Array.from(linkedActiveProductIds)[0];
        const websiteProduct = activeWebsiteProductById.get(websiteProductId);
        if (!websiteProduct) {
          continue;
        }
        const websiteComparable = this.toComparableWebsiteProduct(websiteProduct);
        const diff = this.diffComparableProducts(websiteComparable, remoteComparable);
        if (diff) {
          edits.push({
            websiteProductId,
            remoteProductId: remoteProduct.id,
            reason: "link",
            skuMatches: [],
            title: this.getRemoteTitle(remoteProduct, normalizedVariants),
            website: websiteComparable,
            remote: remoteComparable,
            diff,
          });
        } else {
          noChanges.push({
            websiteProductId,
            remoteProductId: remoteProduct.id,
            reason: "link",
            skuMatches: [],
            title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          });
        }
        matchedWebsiteProductIds.add(websiteProductId);
        continue;
      }

      if (linkedArchivedProductIds.size === 1 && linkedActiveProductIds.size === 0) {
        const websiteProductId = Array.from(linkedArchivedProductIds)[0];
        const websiteProduct = archivedWebsiteProductById.get(websiteProductId);
        if (!websiteProduct) {
          continue;
        }
        const websiteComparable = this.toComparableWebsiteProduct(websiteProduct);
        restores.push({
          websiteProductId,
          remoteProductId: remoteProduct.id,
          title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          skuSample: normalizedVariants[0]?.externalSku ?? null,
          reason: "link",
          website: websiteComparable,
          remote: remoteComparable,
          diff: this.diffComparableProducts(websiteComparable, remoteComparable),
        });
        continue;
      }

      const candidateActiveProductIds = new Set<string>();
      const candidateArchivedProductIds = new Set<string>();
      const skuMatches = new Set<string>();

      for (const variant of normalizedVariants) {
        const normalizedSku = this.normalizeSku(variant.externalSku);
        if (!normalizedSku) {
          continue;
        }
        const activeProductIds = activeSkuIndex.get(normalizedSku) ?? [];
        for (const productId of activeProductIds) {
          candidateActiveProductIds.add(productId);
          skuMatches.add(normalizedSku);
        }
        const archivedProductIds = archivedSkuIndex.get(normalizedSku) ?? [];
        for (const productId of archivedProductIds) {
          candidateArchivedProductIds.add(productId);
          skuMatches.add(normalizedSku);
        }
      }

      if (candidateActiveProductIds.size === 1 && candidateArchivedProductIds.size === 0) {
        const websiteProductId = Array.from(candidateActiveProductIds)[0];
        const websiteProduct = activeWebsiteProductById.get(websiteProductId);
        if (!websiteProduct) {
          continue;
        }
        const websiteComparable = this.toComparableWebsiteProduct(websiteProduct);
        const diff = this.diffComparableProducts(websiteComparable, remoteComparable);
        if (diff) {
          edits.push({
            websiteProductId,
            remoteProductId: remoteProduct.id,
            reason: "sku",
            skuMatches: Array.from(skuMatches),
            title: this.getRemoteTitle(remoteProduct, normalizedVariants),
            website: websiteComparable,
            remote: remoteComparable,
            diff,
          });
        } else {
          noChanges.push({
            websiteProductId,
            remoteProductId: remoteProduct.id,
            reason: "sku",
            skuMatches: Array.from(skuMatches),
            title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          });
        }
        matchedWebsiteProductIds.add(websiteProductId);
        continue;
      }

      if (
        candidateArchivedProductIds.size === 1 &&
        candidateActiveProductIds.size === 0
      ) {
        const websiteProductId = Array.from(candidateArchivedProductIds)[0];
        const websiteProduct = archivedWebsiteProductById.get(websiteProductId);
        if (!websiteProduct) {
          continue;
        }
        const websiteComparable = this.toComparableWebsiteProduct(websiteProduct);
        restores.push({
          websiteProductId,
          remoteProductId: remoteProduct.id,
          title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          skuSample: normalizedVariants[0]?.externalSku ?? null,
          reason: "sku",
          website: websiteComparable,
          remote: remoteComparable,
          diff: this.diffComparableProducts(websiteComparable, remoteComparable),
        });
        continue;
      }

      const totalCandidateCount =
        linkedActiveProductIds.size +
        linkedArchivedProductIds.size +
        candidateActiveProductIds.size +
        candidateArchivedProductIds.size;

      if (totalCandidateCount > 1) {
        const candidateProductIds = new Set<string>([
          ...linkedActiveProductIds,
          ...linkedArchivedProductIds,
          ...candidateActiveProductIds,
          ...candidateArchivedProductIds,
        ]);

        for (const productId of candidateActiveProductIds) {
          conflictWebsiteProductIds.add(productId);
        }
        conflicts.push({
          remoteProductId: remoteProduct.id,
          title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          candidateWebsiteProductIds: Array.from(candidateProductIds),
          skuMatches: Array.from(skuMatches),
          remote: remoteComparable,
        });
        continue;
      }

      imports.push({
        remoteProductId: remoteProduct.id,
        title: this.getRemoteTitle(remoteProduct, normalizedVariants),
        skuSample: normalizedVariants[0]?.externalSku ?? null,
        remote: remoteComparable,
      });
    }

    return {
      noChanges,
      edits,
      imports,
      restores,
      conflicts,
      matchedWebsiteProductIds,
      conflictWebsiteProductIds,
    };
  }

  private buildLinkIndex(links: LightspeedLink[]) {
    const index = new Map<string, LightspeedLink>();

    for (const link of links) {
      const candidates = [
        link.lightspeed_family_id,
        link.lightspeed_product_id,
        link.lightspeed_variant_id,
      ];

      for (const candidate of candidates) {
        if (candidate?.trim() && !index.has(candidate)) {
          index.set(candidate, link);
        }
      }
    }

    return index;
  }

  private buildWebsiteSkuIndex(
    products: ProductWithDetails[],
    linkedWebsiteProductIds: Set<string>,
  ) {
    const index = new Map<string, string[]>();

    for (const product of products) {
      if (linkedWebsiteProductIds.has(product.id)) {
        continue;
      }

      for (const variant of product.variants) {
        const normalizedSku = this.normalizeSku(variant.sku);
        if (!normalizedSku) {
          continue;
        }

        const existing = index.get(normalizedSku) ?? [];
        if (!existing.includes(product.id)) {
          existing.push(product.id);
          index.set(normalizedSku, existing);
        }
      }
    }

    return index;
  }

  private normalizeSku(input: string | null | undefined) {
    const value = input?.trim() ?? "";
    return value.length > 0 ? value : null;
  }

  private findSingleArchivedSkuCandidate(
    remoteProduct: LightspeedRemoteProduct,
    archivedSkuIndex: Map<string, string[]>,
  ) {
    const normalizedVariants = this.mappingService.normalizeRemoteProducts([remoteProduct]);
    const productIds = new Set<string>();

    for (const variant of normalizedVariants) {
      const normalizedSku = this.normalizeSku(variant.externalSku);
      if (!normalizedSku) {
        continue;
      }

      for (const productId of archivedSkuIndex.get(normalizedSku) ?? []) {
        productIds.add(productId);
      }
    }

    return productIds.size === 1 ? Array.from(productIds)[0] : null;
  }

  private async toComparableRemoteProduct(
    tenantId: string,
    remoteProduct: LightspeedRemoteProduct,
  ): Promise<ReconciliationComparableProduct> {
    const normalized = this.mappingService.normalizeRemoteProducts([remoteProduct]);
    const first = normalized[0];
    if (!first) {
      return {
        title: remoteProduct.name?.trim() || "Lightspeed product",
        rowCreatedAt: null,
        productCreatedAt: remoteProduct.created_at ?? null,
        productUpdatedAt: remoteProduct.updated_at ?? null,
        description: remoteProduct.description?.trim() || null,
        brand: "Unknown",
        model: null,
        category: "sneakers",
        condition: "new",
        sizeType: "custom",
        isActive: true,
        isOutOfStock: true,
        imageUrls: [],
        tags: [],
        variants: [],
      };
    }

    const category = (first.category as string | null) ?? "sneakers";
    const sizeType = this.inferSizeType(normalized.map((item) => item.sizeLabel));
    const parsed = await this.parserService.parseTitle({
      titleRaw: this.buildParserTitle(first.cleanName, first.brand),
      category,
      tenantId,
    });
    const resolvedBrand = parsed.brand.label?.trim() || first.brand?.trim() || "Unknown";
    const resolvedModel = parsed.model.label?.trim() || null;
    const tags = buildAutoProductTags({
      brandLabel: resolvedBrand,
      brandGroupKey: parsed.brand.groupKey ?? null,
      modelLabel: resolvedModel,
      category,
      condition: first.condition,
      sizeType,
      variants: normalized.map((item) => ({
        size_label: item.sizeLabel,
        stock: item.stock,
      })),
    });

    return {
      title: first.cleanName,
      rowCreatedAt: null,
      productCreatedAt: remoteProduct.created_at ?? null,
      productUpdatedAt: remoteProduct.updated_at ?? null,
      description: first.description,
      brand: resolvedBrand,
      model: resolvedModel,
      category,
      condition: first.condition,
      sizeType,
      isActive: first.isActive && !first.isDeleted,
      isOutOfStock: normalized.every((item) => item.stock <= 0),
      imageUrls: [...new Set(first.imageUrls.map((item) => item.trim()).filter(Boolean))],
      tags: tags
        .map((tag) => ({ label: tag.label, groupKey: tag.group_key }))
        .sort((a, b) =>
          `${a.groupKey}:${a.label}`.localeCompare(`${b.groupKey}:${b.label}`),
        ),
      variants: normalized
        .map((item, index) => ({
          sku: item.externalSku,
          sizeLabel: item.sizeLabel,
          salePriceCents: item.priceCents ?? 0,
          unitCostCents: item.costCents ?? 0,
          stock: item.stock,
          sortOrder: index,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.sku.localeCompare(b.sku)),
    };
  }

  private toComparableWebsiteProduct(
    product: ProductWithDetails,
  ): ReconciliationComparableProduct {
    const variants = [...product.variants]
      .map((variant) => ({
        sku: variant.sku,
        sizeLabel: variant.size_label,
        salePriceCents: variant.sale_price_cents,
        unitCostCents: variant.unit_cost_cents ?? 0,
        stock: variant.stock,
        sortOrder: variant.sort_order ?? 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.sku.localeCompare(b.sku));

    const imageUrls = [...product.images]
      .sort((a, b) => {
        if (a.is_primary === b.is_primary) {
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        }
        return a.is_primary ? -1 : 1;
      })
      .map((image) => image.url.trim())
      .filter(Boolean);

    const tags = product.tags
      .map((tag) => ({
        label: tag.label,
        groupKey: tag.group_key,
      }))
      .sort((a, b) =>
        `${a.groupKey}:${a.label}`.localeCompare(`${b.groupKey}:${b.label}`),
      );

    return {
      title: product.name,
      rowCreatedAt: product.created_at ?? null,
      productCreatedAt: product.product_created_at ?? product.created_at ?? null,
      productUpdatedAt: product.product_updated_at ?? product.updated_at ?? null,
      description: product.description?.trim() || null,
      brand: product.brand,
      model: product.model?.trim() || null,
      category: product.category,
      condition: product.condition,
      sizeType: product.size_type,
      isActive: Boolean(product.is_active),
      isOutOfStock: Boolean(product.is_out_of_stock),
      imageUrls,
      tags,
      variants,
    };
  }

  private diffComparableProducts(
    website: ReconciliationComparableProduct,
    remote: ReconciliationComparableProduct,
  ): ReconciliationDiff | null {
    const fields: string[] = [];
    if (website.title !== remote.title) {
      fields.push("title");
    }
    if ((website.description ?? null) !== (remote.description ?? null)) {
      fields.push("description");
    }
    if ((website.productCreatedAt ?? null) !== (remote.productCreatedAt ?? null)) {
      fields.push("productCreatedAt");
    }
    if ((website.productUpdatedAt ?? null) !== (remote.productUpdatedAt ?? null)) {
      fields.push("productUpdatedAt");
    }
    if (website.brand !== remote.brand) {
      fields.push("brand");
    }
    if ((website.model ?? null) !== (remote.model ?? null)) {
      fields.push("model");
    }
    if (website.category !== remote.category) {
      fields.push("category");
    }
    if (website.condition !== remote.condition) {
      fields.push("condition");
    }
    if (website.sizeType !== remote.sizeType) {
      fields.push("sizeType");
    }
    if (website.isActive !== remote.isActive) {
      fields.push("isActive");
    }
    if (website.isOutOfStock !== remote.isOutOfStock) {
      fields.push("isOutOfStock");
    }
    if (JSON.stringify(website.imageUrls) !== JSON.stringify(remote.imageUrls)) {
      fields.push("images");
    }
    if (JSON.stringify(website.tags) !== JSON.stringify(remote.tags)) {
      fields.push("tags");
    }

    const variantChanges: ReconciliationDiff["variantChanges"] = [];
    const websiteBySku = new Map(website.variants.map((variant) => [variant.sku, variant]));
    const remoteBySku = new Map(remote.variants.map((variant) => [variant.sku, variant]));
    const allSkus = new Set([...websiteBySku.keys(), ...remoteBySku.keys()]);

    for (const sku of allSkus) {
      const left = websiteBySku.get(sku);
      const right = remoteBySku.get(sku);
      if (!left && right) {
        variantChanges.push({ sku, fields: ["variant"], changeType: "added" });
        continue;
      }
      if (left && !right) {
        variantChanges.push({ sku, fields: ["variant"], changeType: "removed" });
        continue;
      }
      if (!left || !right) {
        continue;
      }

      const changedFields: string[] = [];
      if (left.sizeLabel !== right.sizeLabel) {
        changedFields.push("sizeLabel");
      }
      if (left.salePriceCents !== right.salePriceCents) {
        changedFields.push("salePriceCents");
      }
      if (left.unitCostCents !== right.unitCostCents) {
        changedFields.push("unitCostCents");
      }
      if (left.stock !== right.stock) {
        changedFields.push("stock");
      }
      if (left.sortOrder !== right.sortOrder) {
        changedFields.push("sortOrder");
      }

      if (changedFields.length > 0) {
        variantChanges.push({ sku, fields: changedFields, changeType: "changed" });
      }
    }

    if (variantChanges.length > 0) {
      fields.push("variants");
    }

    if (fields.length === 0) {
      return null;
    }

    return { fields, variantChanges };
  }

  private inferSizeType(sizeLabels: string[]): SizeType | "custom" {
    const normalized = sizeLabels.map((label) => label.trim().toUpperCase());

    if (
      normalized.some(
        (label) => /^\d/.test(label) || label.includes("M") || label.endsWith("W"),
      )
    ) {
      return "shoe";
    }

    if (
      normalized.some((label) =>
        ["XS", "S", "SMALL", "M", "MEDIUM", "L", "LARGE", "XL", "XXL"].includes(label),
      )
    ) {
      return "clothing";
    }

    return "custom";
  }

  private buildParserTitle(cleanName: string, brandHint: string | null) {
    const trimmedName = cleanName.trim();
    const trimmedBrand = brandHint?.trim() || null;
    if (!trimmedBrand) {
      return trimmedName;
    }

    const loweredName = trimmedName.toLowerCase();
    const loweredBrand = trimmedBrand.toLowerCase();
    if (loweredName.startsWith(loweredBrand)) {
      return trimmedName;
    }

    return `${trimmedBrand} ${trimmedName}`.trim();
  }

  private getRemoteTitle(
    remoteProduct: LightspeedRemoteProduct,
    normalizedVariants: ReturnType<LightspeedMappingService["normalizeRemoteProducts"]>,
  ) {
    return (
      normalizedVariants[0]?.cleanName?.trim() ||
      remoteProduct.name?.trim() ||
      "Lightspeed product"
    );
  }

  private async attachSkuFallbackLinks(
    tenantId: string,
    websiteProductId: string,
    remoteProduct: LightspeedRemoteProduct,
    remoteModifiedAt: string,
  ) {
    const websiteProduct = await this.productRepo.getById(websiteProductId, {
      tenantId,
      includeOutOfStock: true,
      includeUnpublished: true,
      archivedStatus: "all",
    });

    if (!websiteProduct) {
      throw new Error("Matched website product no longer exists.");
    }

    const normalizedVariants = this.mappingService.normalizeRemoteProducts([
      remoteProduct,
    ]);
    const websiteVariantBySku = new Map(
      websiteProduct.variants
        .map((variant) => [this.normalizeSku(variant.sku), variant] as const)
        .filter(
          (entry): entry is [string, ProductWithDetails["variants"][number]] =>
            typeof entry[0] === "string",
        ),
    );
    const familyId =
      Array.isArray(remoteProduct.variants) && remoteProduct.variants.length > 0
        ? remoteProduct.id
        : (normalizedVariants[0]?.lightspeedProductId ?? remoteProduct.id);

    for (const remoteVariant of normalizedVariants) {
      const normalizedSku = this.normalizeSku(remoteVariant.externalSku);
      if (!normalizedSku) {
        continue;
      }

      const websiteVariant = websiteVariantBySku.get(normalizedSku);
      if (!websiteVariant) {
        continue;
      }

      await this.linksRepo.upsertLink({
        tenantId,
        productId: websiteProduct.id,
        variantId: websiteVariant.id,
        externalSku: normalizedSku,
        lightspeedFamilyId: familyId,
        lightspeedProductId: familyId,
        lightspeedVariantId: remoteVariant.lightspeedProductId,
        syncState: "linked",
        lastLightspeedModifiedAt: remoteModifiedAt,
        lastSyncDirection: "lightspeed_to_website",
        tombstonedAt: null,
        lastError: null,
      });
    }
  }
}
