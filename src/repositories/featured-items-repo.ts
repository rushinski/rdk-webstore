// src/repositories/featured-items-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/db/database.types";

type FeaturedItemRow = Tables<"featured_items">;
type FeaturedItemInsert = TablesInsert<"featured_items">;
type TenantFilterQuery<TQuery> = {
  eq: (column: string, value: string) => TQuery;
  is: (column: string, value: null) => TQuery;
};

export type FeaturedItemWithProduct = FeaturedItemRow & {
  product: {
    id: string;
    name: string;
    brand: string;
    model: string | null;
    title_display: string;
    category: string;
    is_active: boolean;
    is_out_of_stock: boolean;
    images?: Array<{
      url: string;
      is_primary: boolean;
      sort_order: number;
    }>;
    variants?: Array<{
      id: string;
      size_label: string;
      price_cents: number;
      stock: number;
    }>;
  };
};

export class FeaturedItemsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  /**
   * Apply tenant filter consistently.
   * If tenantId is provided: tenant_id = tenantId
   * Else: tenant_id IS NULL (global featured items)
   */
  private applyTenantFilter<TQuery extends TenantFilterQuery<TQuery>>(
    query: TQuery,
    tenantId?: string,
  ): TQuery {
    if (tenantId) {
      return query.eq("tenant_id", tenantId);
    }
    return query.is("tenant_id", null);
  }

  /**
   * Get all featured items for a tenant (or global when tenantId is undefined), with product details
   * Automatically excludes out-of-stock products
   */
  async list(tenantId?: string): Promise<FeaturedItemWithProduct[]> {
    let query = this.supabase
      .from("featured_items")
      .select(
        `
        *,
        product:products!inner(
          id,
          name,
          brand,
          model,
          title_display,
          category,
          is_active,
          is_out_of_stock,
          images:product_images(url, is_primary, sort_order),
          variants:product_variants(id, size_label, price_cents, stock)
        )
      `,
      )
      .eq("product.is_active", true)
      .eq("product.is_out_of_stock", false)
      .order("sort_order", { ascending: true });

    query = this.applyTenantFilter(query, tenantId);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as FeaturedItemWithProduct[];
  }

  /**
   * Add a product to featured items
   */
  async add(input: {
    productId: string;
    tenantId?: string;
    userId: string;
  }): Promise<FeaturedItemRow> {
    // Get the next sort order
    let maxOrderQuery = this.supabase
      .from("featured_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    maxOrderQuery = this.applyTenantFilter(maxOrderQuery, input.tenantId);

    const { data: maxOrder, error: maxOrderError } = await maxOrderQuery.maybeSingle();
    if (maxOrderError) {
      throw maxOrderError;
    }

    const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

    const insert: FeaturedItemInsert = {
      product_id: input.productId,
      tenant_id: input.tenantId ?? null,
      sort_order: nextOrder,
      created_by: input.userId,
    };

    const { data, error } = await this.supabase
      .from("featured_items")
      .insert(insert)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as FeaturedItemRow;
  }

  /**
   * Remove a product from featured items
   */
  async remove(productId: string, tenantId?: string): Promise<void> {
    let query = this.supabase.from("featured_items").delete().eq("product_id", productId);

    query = this.applyTenantFilter(query, tenantId);

    const { error } = await query;
    if (error) {
      throw error;
    }
  }

  /**
   * Update sort order for featured items
   */
  async updateOrder(
    updates: Array<{ id: string; sortOrder: number }>,
    tenantId?: string,
  ): Promise<void> {
    for (const update of updates) {
      let query = this.supabase
        .from("featured_items")
        .update({ sort_order: update.sortOrder })
        .eq("id", update.id);

      query = this.applyTenantFilter(query, tenantId);

      const { error } = await query;
      if (error) {
        throw error;
      }
    }
  }

  /**
   * Check if a product is featured
   */
  async isFeatured(productId: string, tenantId?: string): Promise<boolean> {
    let query = this.supabase
      .from("featured_items")
      .select("id")
      .eq("product_id", productId)
      .limit(1);

    query = this.applyTenantFilter(query, tenantId);

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  /**
   * Get featured item count for a tenant
   */
  async count(tenantId?: string): Promise<number> {
    let query = this.supabase
      .from("featured_items")
      .select("id", { count: "exact", head: true });

    query = this.applyTenantFilter(query, tenantId);

    const { count, error } = await query;
    if (error) {
      throw error;
    }

    return count ?? 0;
  }
}
