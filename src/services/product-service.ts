// src/services/product-service.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { ProductRepository, type ProductFilters } from "@/repositories/product-repo";
import type { TablesInsert } from "@/types/database.types";
import type { Category, Condition } from "@/types/views/product";
import { buildSizeTags, upsertTags, type TagInputItem } from "./tag-service";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ProductTitleParserService } from "@/services/product-title-parser-service";

type VariantInput = Pick<
  TablesInsert<"product_variants">,
  "size_type" | "size_label" | "price_cents" | "stock" | "cost_cents"
>;

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
  variants: VariantInput[];
  images: ImageInput[];
  tags?: TagInputItem[];
}

export class ProductService {
  private repo: ProductRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new ProductRepository(supabase);
  }

  async listProducts(filters: ProductFilters) {
    return this.repo.list(filters);
  }

  async createProduct(
    input: ProductCreateInput,
    ctx: { userId: string; tenantId: string; marketplaceId?: string | null; sellerId?: string | null }
  ) {
    if (!input.title_raw?.trim()) {
      throw new Error("Product title is required.");
    }

    const parser = new ProductTitleParserService(this.supabase);
    const parsed = await parser.parseTitle({
      titleRaw: input.title_raw,
      category: input.category,
      brandOverrideId: input.brand_override_id ?? null,
      modelOverrideId: input.model_override_id ?? null,
      tenantId: ctx.tenantId,
    });

    const sku = this.generateSKU(parsed.brand.label, parsed.name);
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
      is_active: true,
      created_by: ctx.userId,
    });

    for (const variant of input.variants) {
      await this.repo.createVariant({
        product_id: product.id,
        cost_cents: variant.cost_cents ?? 0,
        ...variant,
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
    ctx: { userId: string; tenantId: string }
  ) {
    const existing = await this.repo.getById(productId);
    if (!existing) {
      throw new Error("Product not found");
    }
    if (!input.title_raw?.trim()) {
      throw new Error("Product title is required.");
    }

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
    });

    await this.repo.deleteVariantsByProduct(productId);
    for (const variant of input.variants) {
      await this.repo.createVariant({
        product_id: productId,
        cost_cents: variant.cost_cents ?? 0,
        ...variant,
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
    ctx: { userId: string; tenantId: string; marketplaceId?: string | null; sellerId?: string | null }
  ) {
    const original = await this.repo.getById(productId, { includeOutOfStock: true });
    if (!original) throw new Error("Product not found");

    const input: ProductCreateInput = {
      title_raw: `${
        original.title_raw || `${original.brand} ${original.model ?? ""} ${original.name}`.trim()
      } (Copy)`,
      category: original.category,
      condition: original.condition,
      condition_note: original.condition_note || undefined,
      description: original.description || undefined,
      shipping_override_cents: original.shipping_override_cents ?? undefined,
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
    const product = await this.repo.getById(productId, { includeOutOfStock: true });
    if (!product) return;

    const sizeTags = buildSizeTags(product.variants);
    const preservedTags = product.tags.filter((tag) => !tag.group_key.startsWith("size_"));

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

  async deleteProduct(productId: string) {
    await this.repo.delete(productId);
  }

  private generateSKU(brand: string, name: string): string {
    const prefix = brand.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private getProductCost(variants: VariantInput[]): number {
    const costs = variants
      .map((variant) => variant.cost_cents)
      .filter((cost): cost is number => typeof cost === "number" && !Number.isNaN(cost));

    if (costs.length === 0) return 0;
    return Math.min(...costs);
  }

  private async createCatalogCandidates(
    parsed: {
      candidates: {
        brand?: { rawText: string; normalizedText: string };
        model?: { rawText: string; normalizedText: string; parentBrandId?: string | null };
      };
    },
    ctx: { userId: string; tenantId: string }
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
