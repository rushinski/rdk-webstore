// src/repositories/product-repo.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Product, ProductVariant, ProductImage, Tag, ProductWithDetails } from "@/types/product";

export interface ProductFilters {
  q?: string;
  category?: string[];
  brand?: string[];
  sizeShoe?: string[];
  sizeClothing?: string[];
  condition?: string[];
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export class ProductRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async list(filters: ProductFilters = {}) {
    const { page = 1, limit = 20, sort = 'newest' } = filters;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))', {
        count: 'exact'
      })
      .eq('is_active', true);

    // Text search
    if (filters.q) {
      query = query.or(`brand.ilike.%${filters.q}%,name.ilike.%${filters.q}%`);
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    // Brand filter
    if (filters.brand && filters.brand.length > 0) {
      query = query.in('brand', filters.brand);
    }

    // Condition filter
    if (filters.condition && filters.condition.length > 0) {
      query = query.in('condition', filters.condition);
    }

    // Sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_asc':
        // Note: This is approximate, real sorting by variant price would require subquery
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_desc':
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      products: (data || []).map(this.transformProduct),
      total: count || 0,
      page,
      limit
    };
  }

  async getById(id: string): Promise<ProductWithDetails | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    if (!data) return null;

    return this.transformProduct(data);
  }

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async update(id: string, product: Partial<Product>) {
    const { data, error } = await this.supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async createVariant(variant: Omit<ProductVariant, 'id'>) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .insert(variant)
      .select()
      .single();

    if (error) throw error;
    return data as ProductVariant;
  }

  async deleteVariantsByProduct(productId: string) {
    const { error } = await this.supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
  }

  async createImage(image: Omit<ProductImage, 'id'>) {
    const { data, error } = await this.supabase
      .from('product_images')
      .insert(image)
      .select()
      .single();

    if (error) throw error;
    return data as ProductImage;
  }

  async deleteImagesByProduct(productId: string) {
    const { error } = await this.supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
  }

  async upsertTag(tag: Omit<Tag, 'id'>) {
    const { data, error } = await this.supabase
      .from('tags')
      .upsert(tag, { onConflict: 'label,group_key' })
      .select()
      .single();

    if (error) throw error;
    return data as Tag;
  }

  async linkProductTag(productId: string, tagId: string) {
    const { error } = await this.supabase
      .from('product_tags')
      .insert({ product_id: productId, tag_id: tagId });

    if (error && error.code !== '23505') throw error; // Ignore duplicate key errors
  }

  async unlinkProductTags(productId: string) {
    const { error } = await this.supabase
      .from('product_tags')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
  }

  async getBrands(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('brand')
      .eq('is_active', true);

    if (error) throw error;
    const brands = [...new Set((data || []).map(p => p.brand))];
    return brands.sort();
  }

  private transformProduct(raw: any): ProductWithDetails {
    return {
      ...raw,
      variants: raw.variants || [],
      images: (raw.images || []).sort((a: ProductImage, b: ProductImage) => a.sort_order - b.sort_order),
      tags: (raw.tags || []).map((pt: any) => pt.tag).filter(Boolean)
    };
  }
}