// src/services/product-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { log } from "@/lib/utils/log";
import {
  ProductRepository,
  type ProductFilters,
  type InventoryExportRow,
} from "@/repositories/product-repo";
import type { TablesInsert } from "@/types/db/database.types";
import type { Category, Condition, ProductWithDetails } from "@/types/domain/product";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ProductTitleParserService } from "@/services/product-title-parser-service";

import { buildSizeTags, upsertTags, type TagInputItem } from "./tag-service";

type VariantWriteInput = Pick<
  TablesInsert<"product_variants">,
  "size_type" | "size_label" | "price_cents" | "stock" | "cost_cents"
>;
type VariantInput = VariantWriteInput & {
  id?: string;
};

type ImageInput = Pick<
  TablesInsert<"product_images">,
  "url" | "sort_order" | "is_primary"
>;

export interface ProductCreateInput {
  title_raw: string;
  brand_override_id?: string | null;
  model_override_id?: string | null;
  category: Category;
  condition: Condition;
  condition_note?: string;
  description?: string;
  shipping_override_cents?: number;
  go_live_at?: string;
  variants: VariantInput[];
  images: ImageInput[];
  tags?: TagInputItem[];
  excluded_auto_tag_keys?: string[];
}

export class ProductService {
  private repo: ProductRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new ProductRepository(supabase);
  }

  async exportInventory(filters: ProductFilters): Promise<InventoryExportRow[]> {
    return this.repo.exportInventoryRows(filters);
  }

  async listProducts(filters: ProductFilters) {
    return this.repo.list(filters);
  }

  /**
   * Get a single product by ID with all related data
   */
  async getProductById(
    productId: string,
    options: {
      tenantId: string;
      includeOutOfStock?: boolean;
      includeUnpublished?: boolean;
    },
  ): Promise<ProductWithDetails | null> {
    const product = await this.repo.getById(productId, {
      includeOutOfStock: options.includeOutOfStock,
      includeUnpublished: options.includeUnpublished,
    });

    if (!product) {
      return null;
    }

    // Verify tenant ownership
    if (product.tenant_id !== options.tenantId) {
      return null;
    }

    return product;
  }

  async createProduct(
    input: ProductCreateInput,
    ctx: {
      userId: string;
      tenantId: string;
      marketplaceId?: string | null;
      sellerId?: string | null;
    },
  ) {
    if (!input.title_raw?.trim()) {
      throw new Error("Product title is required.");
    }
    this.assertNoDuplicateVariantSizes(input.variants);

    const parser = new ProductTitleParserService(this.supabase);
    const parsed = await parser.parseTitle({
      titleRaw: input.title_raw,
      category: input.category,
      brandOverrideId: input.brand_override_id ?? null,
      modelOverrideId: input.model_override_id ?? null,
      tenantId: ctx.tenantId,
    });

    const sku = this.generateSKU(parsed.brand.label);
    const productCost = this.getProductCost(input.variants);

    const product = await this.repo.create({
      tenant_id: ctx.tenantId,
      marketplace_id: ctx.marketplaceId ?? null,
      seller_id: ctx.sellerId ?? null,

      brand: parsed.brand.label,
      model: parsed.model.label ?? null,
      name: parsed.name,
      title_raw: parsed.titleRaw,
      title_display: parsed.titleDisplay,
      brand_is_verified: parsed.brand.isVerified,
      model_is_verified: parsed.model.isVerified,
      parse_confidence: parsed.parseConfidence,
      parse_version: parsed.parseVersion,
      category: input.category,
      condition: input.condition,
      condition_note: input.condition_note || null,
      description: input.description || null,
      sku,
      cost_cents: productCost,
      shipping_override_cents: input.shipping_override_cents ?? null,
      go_live_at: this.normalizeGoLiveAt(input.go_live_at),
      is_active: true,
      created_by: ctx.userId,
      excluded_auto_tag_keys: input.excluded_auto_tag_keys ?? [],
    });

    for (const variant of input.variants) {
      const { id: _variantId, ...variantData } = variant;
      await this.repo.createVariant({
        product_id: product.id,
        ...variantData,
        cost_cents: variant.cost_cents ?? 0,
      });
    }

    for (const image of input.images) {
      await this.repo.createImage({
        product_id: product.id,
        ...image,
      });
    }

    const tags = await upsertTags(this.supabase, {
      tenantId: ctx.tenantId,
      tags: input.tags ?? [],
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(product.id, tag.id);
    }

    await this.createCatalogCandidates(parsed, ctx);

    return product;
  }

  async updateProduct(
    productId: string,
    input: ProductCreateInput,
    ctx: { userId: string; tenantId: string },
  ) {
    const existing = await this.repo.getById(productId, {
      includeOutOfStock: true,
      includeUnpublished: true,
    });
    if (!existing) {
      throw new Error("Product not found");
    }
    if (!input.title_raw?.trim()) {
      throw new Error("Product title is required.");
    }
    this.assertNoDuplicateVariantSizes(input.variants);

    const tenantId = existing.tenant_id ?? ctx.tenantId;
    const parser = new ProductTitleParserService(this.supabase);
    const parsed = await parser.parseTitle({
      titleRaw: input.title_raw,
      category: input.category,
      brandOverrideId: input.brand_override_id ?? null,
      modelOverrideId: input.model_override_id ?? null,
      tenantId,
    });

    const productCost = this.getProductCost(input.variants);
    const goLiveAt =
      input.go_live_at !== undefined
        ? this.normalizeGoLiveAt(input.go_live_at)
        : existing.go_live_at;

    const product = await this.repo.update(productId, {
      brand: parsed.brand.label,
      model: parsed.model.label ?? null,
      name: parsed.name,
      title_raw: parsed.titleRaw,
      title_display: parsed.titleDisplay,
      brand_is_verified: parsed.brand.isVerified,
      model_is_verified: parsed.model.isVerified,
      parse_confidence: parsed.parseConfidence,
      parse_version: parsed.parseVersion,
      category: input.category,
      condition: input.condition,
      condition_note: input.condition_note || null,
      description: input.description || null,
      cost_cents: productCost,
      shipping_override_cents: input.shipping_override_cents ?? null,
      go_live_at: goLiveAt,
      excluded_auto_tag_keys: input.excluded_auto_tag_keys ?? [],
    });

    const existingVariants = existing.variants ?? [];
    const existingVariantsById = new Map(
      existingVariants.map((variant) => [variant.id, variant]),
    );
    const incomingVariantIds = new Set<string>();
    const incomingExistingVariants: Array<{
      id: string;
      payload: VariantWriteInput;
    }> = [];
    const incomingNewVariants: VariantWriteInput[] = [];

    for (const variant of input.variants) {
      const variantPayload: VariantWriteInput = {
        size_type: variant.size_type,
        size_label: variant.size_label,
        price_cents: variant.price_cents,
        stock: variant.stock,
        cost_cents: variant.cost_cents ?? 0,
      };

      if (variant.id) {
        if (incomingVariantIds.has(variant.id)) {
          throw new Error("Duplicate variant entry in request.");
        }
        incomingVariantIds.add(variant.id);

        if (!existingVariantsById.has(variant.id)) {
          throw new Error("Invalid variant selected for this product.");
        }

        incomingExistingVariants.push({
          id: variant.id,
          payload: variantPayload,
        });
        continue;
      }

      incomingNewVariants.push(variantPayload);
    }

    const variantsToDelete = existingVariants.filter(
      (variant) => !incomingVariantIds.has(variant.id),
    );
    if (variantsToDelete.length > 0) {
      const variantIdsToDelete = variantsToDelete.map((variant) => variant.id);
      const referencedVariantIds = new Set(
        await this.repo.listReferencedVariantIds(variantIdsToDelete),
      );

      if (referencedVariantIds.size > 0) {
        const blockedLabels = variantsToDelete
          .filter((variant) => referencedVariantIds.has(variant.id))
          .map((variant) => variant.size_label)
          .join(", ");

        throw new Error(
          `Cannot remove variant(s) with existing orders (${blockedLabels}). Set stock to 0 instead.`,
        );
      }

      for (const variant of variantsToDelete) {
        await this.repo.deleteVariant(variant.id);
      }
    }

    // Avoid transient unique conflicts while renaming/swapping sizes by parking changed keys first.
    const variantsRequiringTemporaryKey = incomingExistingVariants.filter(
      ({ id, payload }) => {
        const existingVariant = existingVariantsById.get(id);
        if (!existingVariant) {
          return false;
        }
        return (
          existingVariant.size_type !== payload.size_type ||
          existingVariant.size_label !== payload.size_label
        );
      },
    );

    for (const { id } of variantsRequiringTemporaryKey) {
      await this.repo.updateVariant(id, {
        size_label: `__tmp__${productId}_${id}`,
      });
    }

    for (const { id, payload } of incomingExistingVariants) {
      await this.repo.updateVariant(id, payload);
    }

    for (const payload of incomingNewVariants) {
      await this.repo.createVariant({
        product_id: productId,
        ...payload,
      });
    }

    await this.repo.deleteImagesByProduct(productId);
    for (const image of input.images) {
      await this.repo.createImage({
        product_id: productId,
        ...image,
      });
    }

    await this.repo.unlinkProductTags(productId);
    const tags = await upsertTags(this.supabase, {
      tenantId: tenantId,
      tags: input.tags ?? [],
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(productId, tag.id);
    }

    await this.createCatalogCandidates(parsed, { ...ctx, tenantId });

    return product;
  }

  async duplicateProduct(
    productId: string,
    ctx: {
      userId: string;
      tenantId: string;
      marketplaceId?: string | null;
      sellerId?: string | null;
    },
  ) {
    const original = await this.repo.getById(productId, {
      includeOutOfStock: true,
      includeUnpublished: true,
    });
    if (!original) {
      throw new Error("Product not found");
    }

    const input: ProductCreateInput = {
      title_raw: `${
        original.title_raw ||
        `${original.brand} ${original.model ?? ""} ${original.name}`.trim()
      } (Copy)`,
      category: original.category,
      condition: original.condition,
      condition_note: original.condition_note || undefined,
      description: original.description || undefined,
      shipping_override_cents: original.shipping_override_cents ?? undefined,
      go_live_at: original.go_live_at ?? undefined,
      brand_override_id: undefined,
      model_override_id: undefined,
      variants: original.variants.map((v) => ({
        size_type: v.size_type,
        size_label: v.size_label,
        price_cents: v.price_cents,
        cost_cents: v.cost_cents ?? 0,
        stock: v.stock,
      })),
      images: original.images.map((img) => ({
        url: img.url,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      })),
      tags: original.tags.map((tag) => ({
        label: tag.label,
        group_key: tag.group_key,
      })),
    };

    return this.createProduct(input, ctx);
  }

  async syncSizeTags(productId: string) {
    const product = await this.repo.getById(productId, {
      includeOutOfStock: true,
      includeUnpublished: true,
    });
    if (!product) {
      return;
    }

    const sizeTags = buildSizeTags(product.variants);
    const preservedTags = product.tags.filter(
      (tag) => !tag.group_key.startsWith("size_"),
    );

    await this.repo.unlinkProductTags(productId);
    const tags = await upsertTags(this.supabase, {
      tenantId: product.tenant_id ?? null,
      tags: [
        ...preservedTags.map((tag) => ({
          label: tag.label,
          group_key: tag.group_key,
        })),
        ...sizeTags,
      ],
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(productId, tag.id);
    }
  }

  async deleteProduct(productId: string): Promise<{ archived: boolean }> {
    const orderItemCount = await this.repo.countOrderItemsForProduct(productId);

    if (orderItemCount > 0) {
      await this.repo.archive(productId);
      return { archived: true };
    }

    await this.repo.delete(productId);
    return { archived: false };
  }

  private generateSKU(brand: string): string {
    const prefix = brand.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private getProductCost(variants: VariantInput[]): number {
    const costs = variants
      .map((variant) => variant.cost_cents)
      .filter((cost): cost is number => typeof cost === "number" && !Number.isNaN(cost));

    if (costs.length === 0) {
      return 0;
    }
    return Math.min(...costs);
  }

  private assertNoDuplicateVariantSizes(variants: VariantInput[]) {
    const seen = new Set<string>();

    for (const variant of variants) {
      const normalizedSizeLabel = variant.size_label.trim().toLowerCase();
      const key = `${variant.size_type}:${normalizedSizeLabel}`;

      if (seen.has(key)) {
        throw new Error(`Duplicate size "${variant.size_label}" found in variants.`);
      }

      seen.add(key);
    }
  }

  private normalizeGoLiveAt(goLiveAt?: string): string {
    if (!goLiveAt?.trim()) {
      return new Date().toISOString();
    }
    const parsed = new Date(goLiveAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid go-live date/time.");
    }
    return parsed.toISOString();
  }

  private async createCatalogCandidates(
    parsed: {
      candidates: {
        brand?: { rawText: string; normalizedText: string };
        model?: {
          rawText: string;
          normalizedText: string;
          parentBrandId?: string | null;
        };
      };
    },
    ctx: { userId: string; tenantId: string },
  ) {
    const catalogRepo = new CatalogRepository(this.supabase);

    if (parsed.candidates.brand?.rawText) {
      try {
        await catalogRepo.createCandidate({
          tenant_id: ctx.tenantId,
          entity_type: "brand",
          raw_text: parsed.candidates.brand.rawText,
          normalized_text: parsed.candidates.brand.normalizedText,
          status: "new",
          created_by: ctx.userId,
        });
      } catch (error) {
        log({
          level: "warn",
          layer: "service",
          message: "catalog_candidate_create_failed",
          entity: "brand",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (parsed.candidates.model?.rawText && parsed.candidates.model.parentBrandId) {
      try {
        await catalogRepo.createCandidate({
          tenant_id: ctx.tenantId,
          entity_type: "model",
          raw_text: parsed.candidates.model.rawText,
          normalized_text: parsed.candidates.model.normalizedText,
          parent_brand_id: parsed.candidates.model.parentBrandId,
          status: "new",
          created_by: ctx.userId,
        });
      } catch (error) {
        log({
          level: "warn",
          layer: "service",
          message: "catalog_candidate_create_failed",
          entity: "model",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
