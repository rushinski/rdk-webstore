// src/services/product-service.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import type { TablesInsert } from "@/types/database.types";
import type { Category, Condition, SizeType } from "@/types/views/product";
import { generateTags } from "./tag-service";

type VariantInput = Pick<
  TablesInsert<"product_variants">,
  "size_type" | "size_label" | "price_cents" | "stock"
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
  cost_cents: number;
  shipping_override_cents?: number;
  variants: VariantInput[];
  images: ImageInput[];
  custom_tags?: string[];
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
      cost_cents: input.cost_cents,
      shipping_override_cents: input.shipping_override_cents || null,
      is_active: true,
      created_by: ctx.userId,
    });

    // Create variants
    for (const variant of input.variants) {
      await this.repo.createVariant({
        product_id: product.id,
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
    const tags = await generateTags(this.supabase, {
      tenantId: ctx.tenantId,
      brand: input.brand,
      category: input.category,
      condition: input.condition,
      variants: input.variants,
      custom_tags: input.custom_tags,
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(product.id, tag.id);
    }

    return product;
  }

  async updateProduct(productId: string, input: ProductCreateInput) {
    // Update product
    const product = await this.repo.update(productId, {
      brand: input.brand,
      name: input.name,
      category: input.category,
      condition: input.condition,
      condition_note: input.condition_note || null,
      description: input.description || null,
      cost_cents: input.cost_cents,
      shipping_override_cents: input.shipping_override_cents || null,
    });

    // Replace variants
    await this.repo.deleteVariantsByProduct(productId);
    for (const variant of input.variants) {
      await this.repo.createVariant({
        product_id: productId,
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
    const tags = await generateTags(this.supabase, {
      brand: input.brand,
      category: input.category,
      condition: input.condition,
      variants: input.variants,
      custom_tags: input.custom_tags,
    });

    for (const tag of tags) {
      await this.repo.linkProductTag(productId, tag.id);
    }

    return product;
  }

  async duplicateProduct(productId: string, userId: string) {
    const original = await this.repo.getById(productId);
    if (!original) throw new Error('Product not found');

    const input: ProductCreateInput = {
      brand: original.brand,
      name: `${original.name} (Copy)`,
      category: original.category,
      condition: original.condition,
      condition_note: original.condition_note || undefined,
      description: original.description || undefined,
      cost_cents: original.cost_cents,
      shipping_override_cents: original.shipping_override_cents || undefined,
      variants: original.variants.map(v => ({
        size_type: v.size_type,
        size_label: v.size_label,
        price_cents: v.price_cents,
        stock: v.stock,
      })),
      images: original.images.map(img => ({
        url: img.url,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      })),
      custom_tags: original.tags.filter(t => !['brand', 'category', 'condition'].includes(t.group_key)).map(t => t.label),
    };

    return this.createProduct(input, { userId, tenantId: "test" });
  }

  private generateSKU(brand: string, name: string): string {
    const prefix = brand.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}