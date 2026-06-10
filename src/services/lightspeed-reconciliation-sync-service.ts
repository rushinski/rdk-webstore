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
import { ProductService } from "@/services/product-service";

type ReconciliationMatchReason = "link" | "sku";

export type LightspeedReconciliationPreview = {
  matchedCount: number;
  importCount: number;
  archiveCount: number;
  conflictCount: number;
  matched: Array<{
    websiteProductId: string;
    remoteProductId: string;
    reason: ReconciliationMatchReason;
    skuMatches: string[];
  }>;
  imports: Array<{
    remoteProductId: string;
    title: string;
    skuSample: string | null;
  }>;
  archives: Array<{
    websiteProductId: string;
    title: string;
    skuSample: string | null;
  }>;
  conflicts: Array<{
    remoteProductId: string;
    title: string;
    candidateWebsiteProductIds: string[];
    skuMatches: string[];
  }>;
};

export type LightspeedReconciliationApplyResult = {
  matchedCount: number;
  importedCount: number;
  archivedCount: number;
  conflictCount: number;
  failedCount: number;
};

export type LightspeedReconciliationChunkResult = {
  importedCount?: number;
  archivedCount?: number;
  failedCount: number;
};

export type LightspeedReconciliationWebsiteCandidate = {
  websiteProductId: string;
  title: string;
  skuSample: string | null;
};

export type LightspeedReconciliationPreviewScanResult = {
  page: number;
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

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.settingsRepo = new LightspeedSettingsRepository(supabase);
    this.productRepo = new ProductRepository(supabase);
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.inboundSyncService = new LightspeedInboundSyncService(supabase);
    this.productService = new ProductService(supabase);
    this.mappingService = new LightspeedMappingService();
  }

  async preview(input: { tenantId: string }): Promise<LightspeedReconciliationPreview> {
    const client = await this.getClient(input.tenantId);
    const [remoteProducts, websiteProducts, links] = await Promise.all([
      this.listAllRemoteProducts(client),
      this.productRepo.listForReconciliation(input.tenantId),
      this.linksRepo.listByTenant(input.tenantId),
    ]);

    const classification = this.classifyRemoteProducts({
      remoteProducts,
      websiteProducts,
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
      }));

    return {
      matchedCount: classification.matched.length,
      importCount: classification.imports.length,
      archiveCount: archives.length,
      conflictCount: classification.conflicts.length,
      matched: classification.matched,
      imports: classification.imports,
      archives,
      conflicts: classification.conflicts,
    };
  }

  async scanPreviewChunk(input: {
    tenantId: string;
    page: number;
    pageSize: number;
  }): Promise<LightspeedReconciliationPreviewScanResult> {
    const client = await this.getClient(input.tenantId);
    const [pageResult, websiteProducts, links] = await Promise.all([
      client.listProducts(input.page, input.pageSize),
      this.productRepo.listForReconciliation(input.tenantId),
      this.linksRepo.listByTenant(input.tenantId),
    ]);

    const classification = this.classifyRemoteProducts({
      remoteProducts: pageResult.products,
      websiteProducts,
      links,
    });

    return {
      page: input.page,
      pageSize: input.pageSize,
      processedCount: pageResult.products.length,
      totalRemoteProducts: pageResult.totalProducts ?? null,
      hasNextPage: pageResult.hasNextPage,
      nextPage: pageResult.hasNextPage ? input.page + 1 : null,
      preview: {
        matchedCount: classification.matched.length,
        importCount: classification.imports.length,
        archiveCount: 0,
        conflictCount: classification.conflicts.length,
        matched: classification.matched,
        imports: classification.imports,
        archives: [],
        conflicts: classification.conflicts,
      },
      websiteCandidates: websiteProducts.map((product) => ({
        websiteProductId: product.id,
        title: product.name,
        skuSample: product.variants[0]?.sku ?? null,
      })),
    };
  }

  async apply(input: { tenantId: string }): Promise<LightspeedReconciliationApplyResult> {
    const preview = await this.preview(input);
    let importedCount = 0;
    let archivedCount = 0;
    let failedCount = 0;

    for (const match of preview.matched.filter((item) => item.reason === "sku")) {
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
      } catch {
        failedCount += 1;
      }
    }

    const importResult = await this.applyImportChunk({
      tenantId: input.tenantId,
      remoteProductIds: preview.imports.map((item) => item.remoteProductId),
    });
    importedCount += importResult.importedCount ?? 0;
    failedCount += importResult.failedCount;

    const archiveResult = await this.applyArchiveChunk({
      tenantId: input.tenantId,
      websiteProductIds: preview.archives.map((item) => item.websiteProductId),
    });
    archivedCount += archiveResult.archivedCount ?? 0;
    failedCount += archiveResult.failedCount;

    return {
      matchedCount: preview.matchedCount,
      importedCount,
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
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await client.listProducts(page, 50);
      products.push(...result.products);
      hasNextPage = result.hasNextPage;
      page += 1;
    }

    return products;
  }

  private classifyRemoteProducts(input: {
    remoteProducts: LightspeedRemoteProduct[];
    websiteProducts: ProductWithDetails[];
    links: LightspeedLink[];
  }) {
    const activeLinks = input.links.filter(
      (link) => !link.tombstoned_at && link.product_id,
    );
    const linkByRemoteId = this.buildLinkIndex(activeLinks);
    const linkedWebsiteProductIds = new Set(
      activeLinks
        .map((link) => link.product_id)
        .filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
    );
    const skuIndex = this.buildWebsiteSkuIndex(
      input.websiteProducts,
      linkedWebsiteProductIds,
    );

    const matched: LightspeedReconciliationPreview["matched"] = [];
    const imports: LightspeedReconciliationPreview["imports"] = [];
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

      const linkedProductIds = new Set<string>();
      for (const remoteId of remoteIds) {
        const linked = linkByRemoteId.get(remoteId);
        if (linked?.product_id) {
          linkedProductIds.add(linked.product_id);
        }
      }

      if (linkedProductIds.size === 1) {
        const websiteProductId = Array.from(linkedProductIds)[0];
        matched.push({
          websiteProductId,
          remoteProductId: remoteProduct.id,
          reason: "link",
          skuMatches: [],
        });
        matchedWebsiteProductIds.add(websiteProductId);
        continue;
      }

      const candidateProductIds = new Set<string>();
      const skuMatches = new Set<string>();

      for (const variant of normalizedVariants) {
        const normalizedSku = this.normalizeSku(variant.externalSku);
        if (!normalizedSku) {
          continue;
        }
        const productIds = skuIndex.get(normalizedSku) ?? [];
        for (const productId of productIds) {
          candidateProductIds.add(productId);
          skuMatches.add(normalizedSku);
        }
      }

      if (candidateProductIds.size === 1) {
        const websiteProductId = Array.from(candidateProductIds)[0];
        matched.push({
          websiteProductId,
          remoteProductId: remoteProduct.id,
          reason: "sku",
          skuMatches: Array.from(skuMatches),
        });
        matchedWebsiteProductIds.add(websiteProductId);
        continue;
      }

      if (candidateProductIds.size > 1) {
        for (const productId of candidateProductIds) {
          conflictWebsiteProductIds.add(productId);
        }
        conflicts.push({
          remoteProductId: remoteProduct.id,
          title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          candidateWebsiteProductIds: Array.from(candidateProductIds),
          skuMatches: Array.from(skuMatches),
        });
        continue;
      }

      imports.push({
        remoteProductId: remoteProduct.id,
        title: this.getRemoteTitle(remoteProduct, normalizedVariants),
        skuSample: normalizedVariants[0]?.externalSku ?? null,
      });
    }

    return {
      matched,
      imports,
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
