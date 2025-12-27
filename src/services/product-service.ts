// src/services/product-service.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import type { TablesInsert } from "@/types/database.types";
import type { Category, Condition } from "@/types/views/product";
import { buildSizeTags, upsertTags, type TagInputItem } from "./tag-service";

type VariantInput = Pick<
  TablesInsert<"product_variants">,
  "size_type" | "size_label" | "price_cents" | "stock" | "cost_cents"
>;

type ImageInput = Pick<
  TablesInsert<"product_images">,
  "url" | "sort_order" | "is_primary"
>;

export interface ProductCreateInput {
  brand: string;
  name: string;
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

  async createProduct(
    input: ProductCreateInput,
    ctx: { userId: string; tenantId: string; marketplaceId?: string | null; sellerId?: string | null }
  ) {
    // Generate SKU
    const sku = this.generateSKU(input.brand, input.name);
    const productCost = this.getProductCost(input.variants);

    // Create product
    const product = await this.repo.create({
      tenant_id: ctx.tenantId,
      marketplace_id: ctx.marketplaceId ?? null,
      seller_id: ctx.sellerId ?? null,

      brand: input.brand,
      name: input.name,
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

    // Create variants
    for (const variant of input.variants) {
      await this.repo.createVariant({
        product_id: product.id,
        cost_cents: variant.cost_cents ?? 0,
        ...variant,
      });
    }

    // Create images
    for (const image of input.images) {
      await this.repo.createImage({
        product_id: product.id,
        ...image,
      });
    }

    // Generate and link tags
    const tags = await upsertTags(this.supabase, {
      tenantId: ctx.tenantId,
      tags: input.tags ?? [],
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(product.id, tag.id);
    }

    return product;
  }

  async updateProduct(productId: string, input: ProductCreateInput) {
    const existing = await this.repo.getById(productId);
    if (!existing) {
      throw new Error("Product not found");
    }

    const productCost = this.getProductCost(input.variants);

    // Update product
    const product = await this.repo.update(productId, {
      brand: input.brand,
      name: input.name,
      category: input.category,
      condition: input.condition,
      condition_note: input.condition_note || null,
      description: input.description || null,
      cost_cents: productCost,
      shipping_override_cents: input.shipping_override_cents ?? null,
    });

    // Replace variants
    await this.repo.deleteVariantsByProduct(productId);
    for (const variant of input.variants) {
      await this.repo.createVariant({
        product_id: productId,
        cost_cents: variant.cost_cents ?? 0,
        ...variant,
      });
    }

    // Replace images
    await this.repo.deleteImagesByProduct(productId);
    for (const image of input.images) {
      await this.repo.createImage({
        product_id: productId,
        ...image,
      });
    }

    // Replace tags
    await this.repo.unlinkProductTags(productId);
    const tags = await upsertTags(this.supabase, {
      tenantId: existing.tenant_id ?? null,
      tags: input.tags ?? [],
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(productId, tag.id);
    }

    return product;
  }

  async duplicateProduct(
    productId: string,
    ctx: { userId: string; tenantId: string; marketplaceId?: string | null; sellerId?: string | null }
  ) {
    const original = await this.repo.getById(productId);
    if (!original) throw new Error('Product not found');

    const input: ProductCreateInput = {
      brand: original.brand,
      name: `${original.name} (Copy)`,
      category: original.category,
      condition: original.condition,
      condition_note: original.condition_note || undefined,
      description: original.description || undefined,
      shipping_override_cents: original.shipping_override_cents ?? undefined,
      variants: original.variants.map(v => ({
        size_type: v.size_type,
        size_label: v.size_label,
        price_cents: v.price_cents,
        cost_cents: v.cost_cents ?? 0,
        stock: v.stock,
      })),
      images: original.images.map(img => ({
        url: img.url,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      })),
      tags: original.tags.map(tag => ({
        label: tag.label,
        group_key: tag.group_key,
      })),
    };

    return this.createProduct(input, ctx);
  }

  async syncSizeTags(productId: string) {
    const product = await this.repo.getById(productId);
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
}
