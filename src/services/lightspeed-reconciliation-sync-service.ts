import { LightspeedClient } from "@/lib/lightspeed/client";
import type { LightspeedRemoteProduct } from "@/lib/lightspeed/types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import {
  LightspeedLinksRepository,
  type LightspeedLink,
} from "@/repositories/lightspeed-links-repo";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { ProductRepository, type ProductWithDetails } from "@/repositories/product-repo";
import { LightspeedInboundSyncService } from "@/services/lightspeed-inbound-sync-service";
import {
  resolveWebsiteCategoryAndSizeType,
  type SyncOverrideCategory,
} from "@/services/lightspeed-category-resolution";
import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { ProductService } from "@/services/product-service";
import { buildAutoProductTags } from "@/services/tag-service";

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
    skuSample: string | null;
    candidateWebsiteProductIds: string[];
    skuMatches: string[];
    remote: ReconciliationComparableProduct;
    conflictReason?: "multiple_candidates" | "missing_category";
    resolutionOptions?: {
      categories: SyncOverrideCategory[];
    };
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
  failureDetails: LightspeedReconciliationFailureDetail[];
  resultItems: LightspeedReconciliationResultItem[];
};

export type LightspeedReconciliationChunkResult = {
  importedCount?: number;
  editedCount?: number;
  restoredCount?: number;
  archivedCount?: number;
  failedCount: number;
  failureDetails?: LightspeedReconciliationFailureDetail[];
  resultItems?: LightspeedReconciliationResultItem[];
};

export type LightspeedReconciliationFailureDetail = {
  operation: "import" | "edit" | "restore" | "archive";
  message: string;
  reason?: string;
  remoteProductId?: string;
  websiteProductId?: string;
};

export type LightspeedReconciliationResultItem = {
  status: "success" | "failure";
  operation: "import" | "edit" | "restore" | "archive";
  title: string | null;
  skuSample: string | null;
  message: string;
  reason?: string;
  remoteProductId?: string;
  websiteProductId?: string;
};

export type LightspeedReconciliationWebsiteCandidate = {
  websiteProductId: string;
  title: string;
  skuSample: string | null;
  website: ReconciliationComparableProduct;
};

type CategoryOverrideInput = Array<{
  remoteProductId: string;
  category: SyncOverrideCategory;
}>;

export type LightspeedReconciliationDiagnosis = {
  remoteProductId: string;
  remoteProductKind: ReturnType<LightspeedMappingService["getRemoteProductKind"]>;
  remoteIds: string[];
  normalizedExternalSkus: string[];
  linkedActiveWebsiteProductIds: string[];
  linkedArchivedWebsiteProductIds: string[];
  candidateActiveWebsiteProductIds: string[];
  candidateArchivedWebsiteProductIds: string[];
  skuMatches: string[];
  classification:
    | "missing_remote"
    | "no_change"
    | "edit"
    | "restore"
    | "conflict"
    | "import";
  matchReason: ReconciliationMatchReason | null;
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

    const hydratedRemoteProducts = await this.hydrateRemoteFamilies(
      client,
      remoteProducts,
    );

    const classification = await this.classifyRemoteProducts({
      tenantId: input.tenantId,
      remoteProducts: hydratedRemoteProducts,
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
    const [pageResult, websiteProducts, archivedWebsiteProducts, links] =
      await Promise.all([
        client.listProducts({
          after: input.after,
          pageSize: input.pageSize,
        }),
        this.productRepo.listForReconciliation(input.tenantId, "active"),
        this.productRepo.listForReconciliation(input.tenantId, "archived"),
        this.linksRepo.listByTenant(input.tenantId),
      ]);

    const familyProducts = this.buildRemoteFamilies(pageResult.products);
    const hydratedRemoteProducts = await this.hydrateRemoteFamilies(
      client,
      familyProducts,
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
      processedCount: hydratedRemoteProducts.length,
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

  async diagnoseRemoteProduct(input: {
    tenantId: string;
    remoteProductId: string;
  }): Promise<LightspeedReconciliationDiagnosis> {
    const client = await this.getClient(input.tenantId);
    const resolvedRemoteProduct = await this.resolveRemoteFamiliesByIds(client, [
      input.remoteProductId,
    ]);
    const [remoteProduct, activeWebsiteProducts, archivedWebsiteProducts, links] =
      await Promise.all([
        Promise.resolve(resolvedRemoteProduct.get(input.remoteProductId) ?? null),
        this.productRepo.listForReconciliation(input.tenantId, "active"),
        this.productRepo.listForReconciliation(input.tenantId, "archived"),
        this.linksRepo.listByTenant(input.tenantId),
      ]);

    if (!remoteProduct) {
      return {
        remoteProductId: input.remoteProductId,
        remoteProductKind: "standard",
        remoteIds: [],
        normalizedExternalSkus: [],
        linkedActiveWebsiteProductIds: [],
        linkedArchivedWebsiteProductIds: [],
        candidateActiveWebsiteProductIds: [],
        candidateArchivedWebsiteProductIds: [],
        skuMatches: [],
        classification: "missing_remote",
        matchReason: null,
      };
    }

    const activeLinks = links.filter((link) => !link.tombstoned_at && link.product_id);
    const linkByRemoteId = this.buildLinkIndex(activeLinks);
    const activeWebsiteProductIds = new Set(
      activeWebsiteProducts.map((product) => product.id),
    );
    const archivedWebsiteProductIds = new Set(
      archivedWebsiteProducts.map((product) => product.id),
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
      activeWebsiteProducts,
      linkedActiveWebsiteProductIds,
    );
    const archivedSkuIndex = this.buildWebsiteSkuIndex(
      archivedWebsiteProducts,
      linkedArchivedWebsiteProductIds,
    );

    const normalizedVariants = this.mappingService.normalizeRemoteProducts([
      remoteProduct,
    ]);
    const remoteIds = new Set<string>([
      remoteProduct.id,
      ...normalizedVariants.map((variant) => variant.lightspeedProductId).filter(Boolean),
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

    let classification: LightspeedReconciliationDiagnosis["classification"] = "import";
    let matchReason: ReconciliationMatchReason | null = null;

    if (linkedActiveProductIds.size === 1 && linkedArchivedProductIds.size === 0) {
      const classificationResult = await this.classifyRemoteProducts({
        tenantId: input.tenantId,
        remoteProducts: [remoteProduct],
        activeWebsiteProducts,
        archivedWebsiteProducts,
        links,
      });
      classification = classificationResult.edits.length > 0 ? "edit" : "no_change";
      matchReason = "link";
    } else if (linkedArchivedProductIds.size === 1 && linkedActiveProductIds.size === 0) {
      classification = "restore";
      matchReason = "link";
    } else if (
      candidateActiveProductIds.size === 1 &&
      candidateArchivedProductIds.size === 0
    ) {
      const classificationResult = await this.classifyRemoteProducts({
        tenantId: input.tenantId,
        remoteProducts: [remoteProduct],
        activeWebsiteProducts,
        archivedWebsiteProducts,
        links,
      });
      classification = classificationResult.edits.length > 0 ? "edit" : "no_change";
      matchReason = "sku";
    } else if (
      candidateArchivedProductIds.size === 1 &&
      candidateActiveProductIds.size === 0
    ) {
      classification = "restore";
      matchReason = "sku";
    } else {
      const totalCandidateCount =
        linkedActiveProductIds.size +
        linkedArchivedProductIds.size +
        candidateActiveProductIds.size +
        candidateArchivedProductIds.size;
      if (totalCandidateCount > 1) {
        classification = "conflict";
      }
    }

    return {
      remoteProductId: remoteProduct.id,
      remoteProductKind: this.mappingService.getRemoteProductKind(remoteProduct),
      remoteIds: Array.from(remoteIds),
      normalizedExternalSkus: normalizedVariants.map((variant) => variant.externalSku),
      linkedActiveWebsiteProductIds: Array.from(linkedActiveProductIds),
      linkedArchivedWebsiteProductIds: Array.from(linkedArchivedProductIds),
      candidateActiveWebsiteProductIds: Array.from(candidateActiveProductIds),
      candidateArchivedWebsiteProductIds: Array.from(candidateArchivedProductIds),
      skuMatches: Array.from(skuMatches),
      classification,
      matchReason,
    };
  }

  async apply(input: { tenantId: string }): Promise<LightspeedReconciliationApplyResult> {
    const preview = await this.preview(input);
    let importedCount = 0;
    let editedCount = 0;
    let restoredCount = 0;
    let archivedCount = 0;
    let failedCount = 0;
    const failureDetails: LightspeedReconciliationFailureDetail[] = [];
    const resultItems: LightspeedReconciliationResultItem[] = [];

    for (const match of preview.edits.filter((item) => item.reason === "sku")) {
      try {
        const remoteProduct = await this.getClient(input.tenantId).then(
          async (client) => {
            const families = await this.resolveRemoteFamiliesByIds(client, [
              match.remoteProductId,
            ]);
            return families.get(match.remoteProductId) ?? null;
          },
        );
        if (!remoteProduct) {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            title: match.title,
            skuSample: match.skuMatches[0] ?? null,
            message: "Lightspeed product was not found during sync apply.",
          });
          failureDetails.push({
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            message: "Lightspeed product was not found during sync apply.",
          });
          continue;
        }

        await this.attachSkuFallbackLinks(
          input.tenantId,
          match.websiteProductId,
          remoteProduct,
          remoteProduct.updated_at ?? new Date().toISOString(),
        );

        const result = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
        });

        if (result.status === "applied") {
          editedCount += 1;
          resultItems.push({
            status: "success",
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            title: match.title,
            skuSample: match.skuMatches[0] ?? this.getRemoteSkuSample(remoteProduct),
            message: "Updated website product from Lightspeed.",
          });
        } else {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            title: match.title,
            skuSample: match.skuMatches[0] ?? this.getRemoteSkuSample(remoteProduct),
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
          failureDetails.push({
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
        }
      } catch (error) {
        failedCount += 1;
        resultItems.push(
          this.buildResultItem({
            status: "failure",
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            title: match.title,
            skuSample: match.skuMatches[0] ?? undefined,
            message: this.getErrorMessage(error),
          }),
        );
        failureDetails.push(
          this.buildFailureDetail({
            operation: "edit",
            websiteProductId: match.websiteProductId,
            remoteProductId: match.remoteProductId,
            error,
          }),
        );
      }
    }

    const restoreResult = await this.applyRestoreChunk({
      tenantId: input.tenantId,
      restores: preview.restores,
    });
    restoredCount += restoreResult.restoredCount ?? 0;
    failedCount += restoreResult.failedCount;
    failureDetails.push(...(restoreResult.failureDetails ?? []));
    resultItems.push(...(restoreResult.resultItems ?? []));

    const importResult = await this.applyImportChunk({
      tenantId: input.tenantId,
      remoteProductIds: preview.imports.map((item) => item.remoteProductId),
    });
    importedCount += importResult.importedCount ?? 0;
    failedCount += importResult.failedCount;
    failureDetails.push(...(importResult.failureDetails ?? []));
    resultItems.push(...(importResult.resultItems ?? []));

    const editResult = await this.applyEditChunk({
      tenantId: input.tenantId,
      edits: preview.edits.filter((item) => item.reason === "link"),
    });
    editedCount += editResult.editedCount ?? 0;
    failedCount += editResult.failedCount;
    failureDetails.push(...(editResult.failureDetails ?? []));
    resultItems.push(...(editResult.resultItems ?? []));

    const archiveResult = await this.applyArchiveChunk({
      tenantId: input.tenantId,
      websiteProductIds: preview.archives.map((item) => item.websiteProductId),
    });
    archivedCount += archiveResult.archivedCount ?? 0;
    failedCount += archiveResult.failedCount;
    failureDetails.push(...(archiveResult.failureDetails ?? []));
    resultItems.push(...(archiveResult.resultItems ?? []));

    return {
      noChangeCount: preview.noChangeCount,
      importedCount,
      editedCount,
      restoredCount,
      archivedCount,
      conflictCount: preview.conflictCount,
      failedCount,
      failureDetails,
      resultItems,
    };
  }

  async applyImportChunk(input: {
    tenantId: string;
    remoteProductIds: string[];
    categoryOverrides?: CategoryOverrideInput;
  }): Promise<LightspeedReconciliationChunkResult> {
    const client = await this.getClient(input.tenantId);
    const categoryOverrides = this.buildCategoryOverrideMap(input.categoryOverrides);
    const remoteProductsById = await this.resolveRemoteFamiliesByIds(
      client,
      input.remoteProductIds,
    );
    const archivedWebsiteProducts =
      (await this.productRepo.listForReconciliation(input.tenantId, "archived")) ?? [];
    const archivedWebsiteProductById = new Map(
      archivedWebsiteProducts.map((product) => [product.id, product] as const),
    );
    const archivedSkuIndex = this.buildWebsiteSkuIndex(
      archivedWebsiteProducts,
      new Set(),
    );
    let importedCount = 0;
    let failedCount = 0;
    const failureDetails: LightspeedReconciliationFailureDetail[] = [];
    const resultItems: LightspeedReconciliationResultItem[] = [];

    for (const remoteProductId of input.remoteProductIds) {
      try {
        const remoteProduct = remoteProductsById.get(remoteProductId) ?? null;
        if (!remoteProduct) {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "import",
            remoteProductId,
            title: null,
            skuSample: null,
            message: "Lightspeed product was not found during sync import.",
          });
          failureDetails.push({
            operation: "import",
            remoteProductId,
            message: "Lightspeed product was not found during sync import.",
          });
          continue;
        }

        const result = await this.inboundSyncService.applyProductPayload({
          tenantId: input.tenantId,
          payload: remoteProduct,
          topic: "product.update",
          remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
          categoryOverride: categoryOverrides.get(remoteProductId),
        });

        if (result.status === "applied") {
          importedCount += 1;
          resultItems.push({
            status: "success",
            operation: "import",
            remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Imported website product from Lightspeed.",
          });
          continue;
        }
        if (result.status === "skipped") {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "import",
            remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
          failureDetails.push({
            operation: "import",
            remoteProductId,
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
          continue;
        }

        const archivedFallback = this.findSingleArchivedSkuCandidate(
          remoteProduct,
          archivedSkuIndex,
        );
        if (!archivedFallback) {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "import",
            remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "No archived website product matched this Lightspeed SKU fallback.",
          });
          failureDetails.push({
            operation: "import",
            remoteProductId,
            message: "No archived website product matched this Lightspeed SKU fallback.",
          });
          continue;
        }

        const archivedProduct = archivedWebsiteProductById.get(archivedFallback);
        if (!archivedProduct) {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "import",
            remoteProductId,
            websiteProductId: archivedFallback,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Archived website product disappeared before restore fallback.",
          });
          failureDetails.push({
            operation: "import",
            remoteProductId,
            websiteProductId: archivedFallback,
            message: "Archived website product disappeared before restore fallback.",
          });
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
          categoryOverride: categoryOverrides.get(remoteProductId),
        });

        if (restoredResult.status === "applied") {
          importedCount += 1;
          resultItems.push({
            status: "success",
            operation: "import",
            remoteProductId,
            websiteProductId: archivedProduct.id,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Restored archived website product from Lightspeed.",
          });
        } else {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "import",
            remoteProductId,
            websiteProductId: archivedProduct.id,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Lightspeed inbound sync skipped this restored fallback product.",
            reason: restoredResult.reason,
          });
          failureDetails.push({
            operation: "import",
            remoteProductId,
            websiteProductId: archivedProduct.id,
            message: "Lightspeed inbound sync skipped this restored fallback product.",
            reason: restoredResult.reason,
          });
        }
      } catch (error) {
        failedCount += 1;
        resultItems.push(
          this.buildResultItem({
            status: "failure",
            operation: "import",
            remoteProductId,
            title: null,
            skuSample: null,
            message: this.getErrorMessage(error),
          }),
        );
        failureDetails.push(
          this.buildFailureDetail({
            operation: "import",
            remoteProductId,
            error,
          }),
        );
      }
    }

    return {
      importedCount,
      failedCount,
      failureDetails,
      resultItems,
    };
  }

  async applyEditChunk(input: {
    tenantId: string;
    edits: Array<{
      websiteProductId: string;
      remoteProductId: string;
      reason?: ReconciliationMatchReason;
    }>;
    categoryOverrides?: CategoryOverrideInput;
  }): Promise<LightspeedReconciliationChunkResult> {
    const client = await this.getClient(input.tenantId);
    const categoryOverrides = this.buildCategoryOverrideMap(input.categoryOverrides);
    const remoteProductsById = await this.resolveRemoteFamiliesByIds(
      client,
      input.edits.map((edit) => edit.remoteProductId),
    );
    let editedCount = 0;
    let failedCount = 0;
    const failureDetails: LightspeedReconciliationFailureDetail[] = [];
    const resultItems: LightspeedReconciliationResultItem[] = [];

    for (const edit of input.edits) {
      try {
        const remoteProduct = remoteProductsById.get(edit.remoteProductId) ?? null;
        if (!remoteProduct) {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            title: null,
            skuSample: null,
            message: "Lightspeed product was not found during sync edit.",
          });
          failureDetails.push({
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            message: "Lightspeed product was not found during sync edit.",
          });
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
          categoryOverride: categoryOverrides.get(edit.remoteProductId),
        });

        if (result.status === "applied") {
          editedCount += 1;
          resultItems.push({
            status: "success",
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Updated website product from Lightspeed.",
          });
        } else {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
          failureDetails.push({
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
        }
      } catch (error) {
        failedCount += 1;
        resultItems.push(
          this.buildResultItem({
            status: "failure",
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            title: null,
            skuSample: null,
            message: this.getErrorMessage(error),
          }),
        );
        failureDetails.push(
          this.buildFailureDetail({
            operation: "edit",
            websiteProductId: edit.websiteProductId,
            remoteProductId: edit.remoteProductId,
            error,
          }),
        );
      }
    }

    return {
      editedCount,
      failedCount,
      failureDetails,
      resultItems,
    };
  }

  async applyArchiveChunk(input: {
    tenantId: string;
    websiteProductIds: string[];
  }): Promise<LightspeedReconciliationChunkResult> {
    const activeWebsiteProducts =
      (await this.productRepo.listForReconciliation(input.tenantId, "active")) ?? [];
    const websiteProductById = new Map(
      activeWebsiteProducts.map((product) => [product.id, product] as const),
    );
    let archivedCount = 0;
    let failedCount = 0;
    const failureDetails: LightspeedReconciliationFailureDetail[] = [];
    const resultItems: LightspeedReconciliationResultItem[] = [];

    for (const websiteProductId of input.websiteProductIds) {
      try {
        const result = await this.productService.archiveProduct(
          websiteProductId,
          input.tenantId,
        );
        if (result.archived) {
          archivedCount += 1;
          const websiteProduct = websiteProductById.get(websiteProductId);
          resultItems.push({
            status: "success",
            operation: "archive",
            websiteProductId,
            title: websiteProduct?.name ?? null,
            skuSample: websiteProduct?.variants[0]?.sku ?? null,
            message: "Archived website product missing from Lightspeed.",
          });
        }
      } catch (error) {
        failedCount += 1;
        const websiteProduct = websiteProductById.get(websiteProductId);
        resultItems.push(
          this.buildResultItem({
            status: "failure",
            operation: "archive",
            websiteProductId,
            title: websiteProduct?.name ?? null,
            skuSample: websiteProduct?.variants[0]?.sku ?? null,
            message: this.getErrorMessage(error),
          }),
        );
        failureDetails.push(
          this.buildFailureDetail({
            operation: "archive",
            websiteProductId,
            error,
          }),
        );
      }
    }

    return {
      archivedCount,
      failedCount,
      failureDetails,
      resultItems,
    };
  }

  async applyRestoreChunk(input: {
    tenantId: string;
    restores: Array<{
      websiteProductId: string;
      remoteProductId: string;
      reason?: ReconciliationMatchReason;
    }>;
    categoryOverrides?: CategoryOverrideInput;
  }): Promise<LightspeedReconciliationChunkResult> {
    const client = await this.getClient(input.tenantId);
    const categoryOverrides = this.buildCategoryOverrideMap(input.categoryOverrides);
    const remoteProductsById = await this.resolveRemoteFamiliesByIds(
      client,
      input.restores.map((restore) => restore.remoteProductId),
    );
    let restoredCount = 0;
    let failedCount = 0;
    const failureDetails: LightspeedReconciliationFailureDetail[] = [];
    const resultItems: LightspeedReconciliationResultItem[] = [];

    for (const restore of input.restores) {
      try {
        const remoteProduct = remoteProductsById.get(restore.remoteProductId) ?? null;
        if (!remoteProduct) {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            title: null,
            skuSample: null,
            message: "Lightspeed product was not found during sync restore.",
          });
          failureDetails.push({
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            message: "Lightspeed product was not found during sync restore.",
          });
          continue;
        }

        await this.productService.restoreProduct(
          restore.websiteProductId,
          input.tenantId,
        );

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
          categoryOverride: categoryOverrides.get(restore.remoteProductId),
        });

        if (result.status === "applied") {
          restoredCount += 1;
          resultItems.push({
            status: "success",
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Restored website product from Lightspeed.",
          });
        } else {
          failedCount += 1;
          resultItems.push({
            status: "failure",
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            title: this.getRemoteTitle(
              remoteProduct,
              this.mappingService.normalizeRemoteProducts([remoteProduct]),
            ),
            skuSample: this.getRemoteSkuSample(remoteProduct),
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
          failureDetails.push({
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            message: "Lightspeed inbound sync skipped this product.",
            reason: result.reason,
          });
        }
      } catch (error) {
        failedCount += 1;
        resultItems.push(
          this.buildResultItem({
            status: "failure",
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            title: null,
            skuSample: null,
            message: this.getErrorMessage(error),
          }),
        );
        failureDetails.push(
          this.buildFailureDetail({
            operation: "restore",
            websiteProductId: restore.websiteProductId,
            remoteProductId: restore.remoteProductId,
            error,
          }),
        );
      }
    }

    return {
      restoredCount,
      failedCount,
      failureDetails,
      resultItems,
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
      products.push(...result.products);
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

    return this.buildRemoteFamilies(products);
  }

  private buildRemoteFamilies(products: LightspeedRemoteProduct[]) {
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

  private async hydrateRemoteFamilies(
    client: LightspeedClient,
    products: LightspeedRemoteProduct[],
  ) {
    return Promise.all(
      products.map(async (product) => {
        try {
          const fetched = (await client.getProduct(product.id)) ?? product;
          return this.mergeRemoteProductSnapshots(product, fetched);
        } catch {
          return product;
        }
      }),
    );
  }

  private async resolveRemoteFamiliesByIds(
    client: LightspeedClient,
    productIds: string[],
  ) {
    const requestedIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
    const families = await this.listAllRemoteProducts(client);
    const familyById = new Map(families.map((product) => [product.id, product] as const));
    const resolved = new Map<string, LightspeedRemoteProduct>();

    const seededProducts = await Promise.all(
      requestedIds.map(async (productId) => {
        const family = familyById.get(productId);
        if (family) {
          return family;
        }

        return (await client.getProduct(productId)) ?? null;
      }),
    );

    const hydratedProducts = await this.hydrateRemoteFamilies(
      client,
      seededProducts.filter(
        (product): product is LightspeedRemoteProduct => product !== null,
      ),
    );

    for (const product of hydratedProducts) {
      resolved.set(product.id, product);
    }

    return resolved;
  }

  private mergeRemoteProductSnapshots(
    seed: LightspeedRemoteProduct,
    fetched: LightspeedRemoteProduct,
  ) {
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
      const firstVariant = normalizedVariants[0];
      const resolvedCategory = resolveWebsiteCategoryAndSizeType(firstVariant?.category);
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

      if (resolvedCategory.status === "missing") {
        conflicts.push({
          remoteProductId: remoteProduct.id,
          title: this.getRemoteTitle(remoteProduct, normalizedVariants),
          skuSample: this.getRemoteSkuSample(remoteProduct),
          candidateWebsiteProductIds: [],
          skuMatches: [],
          remote: remoteComparable,
          conflictReason: "missing_category",
          resolutionOptions: {
            categories: ["sneakers", "clothing", "accessories", "electronics"],
          },
        });
        continue;
      }

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

      if (
        candidateActiveProductIds.size === 1 &&
        candidateArchivedProductIds.size === 0
      ) {
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
          skuSample: this.getRemoteSkuSample(remoteProduct),
          candidateWebsiteProductIds: Array.from(candidateProductIds),
          skuMatches: Array.from(skuMatches),
          remote: remoteComparable,
          conflictReason: "multiple_candidates",
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
    const normalizedVariants = this.mappingService.normalizeRemoteProducts([
      remoteProduct,
    ]);
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

  private buildCategoryOverrideMap(
    overrides?: CategoryOverrideInput,
  ): Map<string, SyncOverrideCategory> {
    return new Map(
      (overrides ?? []).map((override) => [
        override.remoteProductId,
        override.category,
      ]),
    );
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

    const resolvedCategory = resolveWebsiteCategoryAndSizeType(first.category);
    const category =
      resolvedCategory.status === "resolved" ? resolvedCategory.category : "sneakers";
    const sizeType =
      resolvedCategory.status === "resolved" ? resolvedCategory.sizeType : "custom";
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
    const websiteBySku = new Map(
      website.variants.map((variant) => [variant.sku, variant]),
    );
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

  private getRemoteSkuSample(remoteProduct: LightspeedRemoteProduct) {
    return (
      this.mappingService.normalizeRemoteProducts([remoteProduct])[0]?.externalSku ?? null
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
      includeInactive: true,
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

  private buildFailureDetail(input: {
    operation: LightspeedReconciliationFailureDetail["operation"];
    error: unknown;
    remoteProductId?: string;
    websiteProductId?: string;
  }): LightspeedReconciliationFailureDetail {
    logError(input.error, {
      layer: "service",
      service: "LightspeedReconciliationSyncService",
      operation: input.operation,
      remoteProductId: input.remoteProductId ?? null,
      websiteProductId: input.websiteProductId ?? null,
    });

    return {
      operation: input.operation,
      remoteProductId: input.remoteProductId,
      websiteProductId: input.websiteProductId,
      message: this.getErrorMessage(input.error),
    };
  }

  private buildResultItem(
    input: LightspeedReconciliationResultItem,
  ): LightspeedReconciliationResultItem {
    return input;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    if (error && typeof error === "object") {
      const record = error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };
      const parts = [
        typeof record.message === "string" ? record.message.trim() : null,
        typeof record.details === "string" ? record.details.trim() : null,
        typeof record.hint === "string" ? record.hint.trim() : null,
        typeof record.code === "string" ? `code ${record.code.trim()}` : null,
      ].filter((value): value is string => Boolean(value));

      if (parts.length > 0) {
        return parts.join(" | ");
      }
    }

    return "Unexpected error applying Lightspeed sync.";
  }
}
