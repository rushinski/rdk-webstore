// src/repositories/product-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export interface ProductFilters {
  q?: string;
  category?: string[];
  brand?: string[];
  sizeShoe?: string[];
  sizeClothing?: string[];
  condition?: string[];
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;

  // Optional multi-tenant hooks (safe now, useful later)
  tenantId?: string;
  sellerId?: string;
  marketplaceId?: string;
}

type ProductRow = Tables<"products">;
type VariantRow = Tables<"product_variants">;
type ImageRow = Tables<"product_images">;
type TagRow = Tables<"tags">;

export type ProductWithDetails = ProductRow & {
  variants: VariantRow[];
  images: ImageRow[];
  tags: TagRow[];
};

type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

type VariantInsert = TablesInsert<"product_variants">;
type ImageInsert = TablesInsert<"product_images">;

type TagInsert = TablesInsert<"tags">;

export class ProductRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async list(filters: ProductFilters = {}) {
    const { page = 1, limit = 20, sort = "newest" } = filters;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from("products")
      .select(
        "*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))",
        { count: "exact" }
      )
      .eq("is_active", true);

    // Tenant/seller/marketplace scoping (optional today, but repo-ready)
    if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);
    if (filters.sellerId) query = query.eq("seller_id", filters.sellerId);
    if (filters.marketplaceId) query = query.eq("marketplace_id", filters.marketplaceId);

    // Text search
    if (filters.q) {
      query = query.or(`brand.ilike.%${filters.q}%,name.ilike.%${filters.q}%`);
    }

    // Category / brand / condition filters
    if (filters.category?.length) query = query.in("category", filters.category);
    if (filters.brand?.length) query = query.in("brand", filters.brand);
    if (filters.condition?.length) query = query.in("condition", filters.condition);

    // Sorting
    switch (sort) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "price_asc":
      case "price_desc":
        // Keep newest until you implement real price sorting via SQL/RPC.
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      products: (data ?? []).map((raw) => this.transformProduct(raw)),
      total: count ?? 0,
      page,
      limit,
    };
  }

  async getById(id: string, opts?: Pick<ProductFilters, "tenantId" | "sellerId" | "marketplaceId">): Promise<ProductWithDetails | null> {
    let query = this.supabase
      .from("products")
      .select("*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))")
      .eq("id", id)
      .eq("is_active", true);

    if (opts?.tenantId) query = query.eq("tenant_id", opts.tenantId);
    if (opts?.sellerId) query = query.eq("seller_id", opts.sellerId);
    if (opts?.marketplaceId) query = query.eq("marketplace_id", opts.marketplaceId);

    const { data, error } = await query.single();
    if (error) throw error;
    if (!data) return null;

    return this.transformProduct(data);
  }

  async create(product: ProductInsert) {
    const { data, error } = await this.supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async update(id: string, product: ProductUpdate) {
    const { data, error } = await this.supabase
      .from("products")
      .update(product)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  }

  async createVariant(variant: VariantInsert) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .insert(variant)
      .select()
      .single();

    if (error) throw error;
    return data as VariantRow;
  }

  async deleteVariantsByProduct(productId: string) {
    const { error } = await this.supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (error) throw error;
  }

  async createImage(image: ImageInsert) {
    const { data, error } = await this.supabase
      .from("product_images")
      .insert(image)
      .select()
      .single();

    if (error) throw error;
    return data as ImageRow;
  }

  async deleteImagesByProduct(productId: string) {
    const { error } = await this.supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);

    if (error) throw error;
  }

  async upsertTag(tag: TagInsert) {
    const { data, error } = await this.supabase
      .from("tags")
      .upsert(tag, { onConflict: "label,group_key" })
      .select()
      .single();

    if (error) throw error;
    return data as TagRow;
  }

  async linkProductTag(productId: string, tagId: string) {
    const { error } = await this.supabase
      .from("product_tags")
      .insert({ product_id: productId, tag_id: tagId });

    // ignore duplicate key (23505)
    if (error && (error as any).code !== "23505") throw error;
  }

  async unlinkProductTags(productId: string) {
    const { error } = await this.supabase
      .from("product_tags")
      .delete()
      .eq("product_id", productId);

    if (error) throw error;
  }

  async getBrands(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("products")
      .select("brand")
      .eq("is_active", true);

    if (error) throw error;
    const brands = [...new Set((data ?? []).map((p) => p.brand).filter(Boolean))];
    return brands.sort();
  }

  private transformProduct(raw: any): ProductWithDetails {
    return {
      ...raw,
      variants: raw.variants ?? [],
      images: (raw.images ?? []).sort((a: ImageRow, b: ImageRow) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      tags: (raw.tags ?? []).map((pt: any) => pt.tag).filter(Boolean),
    };
  }
}
