//  src/repositories/product-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/db/database.types";

export interface ProductFilters {
  q?: string;
  category?: string[];
  brand?: string[];
  model?: string[];
  sizeShoe?: string[];
  sizeClothing?: string[];
  condition?: string[];
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc";
  page?: number;
  limit?: number;
  stockStatus?: "in_stock" | "out_of_stock" | "all";
  includeOutOfStock?: boolean;

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

export type CartVariantDetails = {
  variantId: string;
  productId: string;
  sizeLabel: string;
  priceCents: number;
  stock: number;
  brand: string;
  name: string;
  titleDisplay: string;
  isActive: boolean;
  isOutOfStock: boolean;
  imageUrl: string | null;
};

export type InventoryExportRow = {
  sku: string;
  name: string;
  size: string;
  type: string;
  condition: string;
  priceCents: number;
  costCents: number;
};

type VariantExportRow = {
  size_label: string | null;
  price_cents: number | null;
  cost_cents: number | null;
  stock: number | null;
  product?: {
    sku: string | null;
    title_raw: string | null;
    condition: string | null;
    is_active: boolean | null;
    is_out_of_stock: boolean | null;
    tenant_id: string | null;
    category: string | null;
  };
};

type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

type VariantInsert = TablesInsert<"product_variants">;
type VariantUpdate = TablesUpdate<"product_variants">;
type ImageInsert = TablesInsert<"product_images">;

type TagInsert = TablesInsert<"tags">;

// Helper types for query results
type FilterDataRow = {
  brand: string | null;
  model: string | null;
  brand_is_verified: boolean | null;
  model_is_verified: boolean | null;
  category: string | null;
};

type SizeAvailabilityRow = {
  size_label: string | null;
  size_type: string | null;
};

type ProductWithRelations = ProductRow & {
  variants?: VariantRow[];
  images?: ImageRow[];
  tags?: Array<{ tag: TagRow }>;
};

type VariantWithProduct = {
  product_id: string;
  price_cents: number;
  product?: {
    id: string;
  };
};

type CheckoutProductRow = {
  id: string;
  name: string;
  brand: string;
  model: string | null;
  title_display: string;
  category: string;
  tenant_id: string | null;
  default_shipping_price: number | null;
  shipping_override_cents: number | null;
  variants?: Array<{
    id: string;
    size_label: string;
    price_cents: number;
    cost_cents: number | null;
    stock: number;
  }>;
};

type CartVariantRow = {
  id: string;
  product_id: string;
  size_label: string;
  price_cents: number;
  stock: number;
  product?: {
    id: string;
    brand: string;
    name: string;
    title_raw: string | null;
    title_display: string;
    is_active: boolean;
    is_out_of_stock: boolean;
  };
};

type ProductImageRow = {
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

export class ProductRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  private readonly storefrontSearchFields = [
    "brand",
    "name",
    "model",
    "title_raw",
    "title_display",
  ];

  private readonly inventorySearchFields = ["sku", "title_raw"];

  async exportInventoryRows(filters: ProductFilters): Promise<InventoryExportRow[]> {
    const includeOutOfStock = Boolean(filters.includeOutOfStock);

    let query = this.supabase
      .from("product_variants")
      .select(
        "size_label, price_cents, cost_cents, stock, product:products!inner(sku, title_raw, condition, is_active, is_out_of_stock, tenant_id, category)",
      )
      .eq("product.is_active", true);

    // Tenant scoping (admin inventory is tenant-scoped)
    if (filters.tenantId) {
      query = query.eq("product.tenant_id", filters.tenantId);
    }
    if (filters.sellerId) {
      query = query.eq("product.seller_id", filters.sellerId);
    }
    if (filters.marketplaceId) {
      query = query.eq("product.marketplace_id", filters.marketplaceId);
    }

    // Stock filters: match the inventory UI semantics
    if (filters.stockStatus === "out_of_stock") {
      query = query.eq("product.is_out_of_stock", true);
      // for out_of_stock export, keep all variants (sizes) for printing
    } else if (filters.stockStatus === "in_stock") {
      query = query.eq("product.is_out_of_stock", false).gt("stock", 0);
    } else if (!includeOutOfStock) {
      query = query.eq("product.is_out_of_stock", false).gt("stock", 0);
    }

    // Text search on product fields
    query = this.applyTextSearch(
      query,
      filters.q,
      this.inventorySearchFields,
      { foreignTable: "product" },
    );

    // Category / condition filters
    if (filters.category?.length) {
      query = query.in("product.category", filters.category);
    }
    if (filters.condition?.length) {
      query = query.in("product.condition", filters.condition);
    }

    // Order for stable printing
    query = query
      .order("sku", { ascending: true, foreignTable: "product" })
      .order("size_label", { ascending: true });

    const { data, error } = await query.limit(20000);
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as VariantExportRow[];

    return rows
      .map((r) => {
        const p = r.product;
        const sku = p?.sku?.trim() ?? "";
        const name = p?.title_raw?.trim() ?? "";
        const size = r.size_label?.trim() ?? "";
        const type = p?.category?.trim() ?? "";
        const condition = p?.condition?.trim() ?? "";

        if (!sku || !name || !size || !condition) {
          return null;
        }

        return {
          sku,
          name,
          size,
          type,
          condition,
          priceCents: Number(r.price_cents ?? 0),
          costCents: Number(r.cost_cents ?? 0),
        } as InventoryExportRow;
      })
      .filter((x): x is InventoryExportRow => Boolean(x));
  }

  async list(filters: ProductFilters = {}) {
    const { page = 1, limit = 20, sort = "newest" } = filters;
    const offset = (page - 1) * limit;
    const isPriceSort = sort === "price_asc" || sort === "price_desc";

    const sizeProductIds = isPriceSort
      ? null
      : await this.listProductIdsForSizes(filters);
    if (Array.isArray(sizeProductIds) && sizeProductIds.length === 0) {
      return { products: [], total: 0, page, limit };
    }

    // IMPORTANT:
    // - Storefront must not include out-of-stock items by default.
    // - Admin can include them by passing includeOutOfStock=true.
    const includeOutOfStock = Boolean(filters.includeOutOfStock);

    let total = 0;
    let ids: string[] = [];

    if (isPriceSort) {
      const result = await this.listProductIdsByPrice(filters, sort, includeOutOfStock);
      ids = result.ids;
      total = result.total;
    } else {
      let query = this.supabase
        .from("products")
        .select("id", { count: "exact" })
        .eq("is_active", true);

      // Tenant/seller/marketplace scoping
      if (filters.tenantId) {
        query = query.eq("tenant_id", filters.tenantId);
      }
      if (filters.sellerId) {
        query = query.eq("seller_id", filters.sellerId);
      }
      if (filters.marketplaceId) {
        query = query.eq("marketplace_id", filters.marketplaceId);
      }

      if (filters.stockStatus === "out_of_stock") {
        query = query.eq("is_out_of_stock", true);
      } else if (filters.stockStatus === "in_stock") {
        query = query.eq("is_out_of_stock", false);
      } else if (!includeOutOfStock) {
        // default (storefront-safe)
        query = query.eq("is_out_of_stock", false);
      }

      // Text search
      query = this.applyTextSearch(query, filters.q, this.storefrontSearchFields);

      // Category / brand / condition filters
      if (filters.category?.length) {
        query = query.in("category", filters.category);
      }
      if (filters.brand?.length) {
        query = query.in("brand", filters.brand);
      }
      if (filters.model?.length) {
        query = query.in("model", filters.model);
      }
      if (filters.condition?.length) {
        query = query.in("condition", filters.condition);
      }

      if (Array.isArray(sizeProductIds)) {
        query = query.in("id", sizeProductIds);
      }

      // Sorting
      switch (sort) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "name_asc":
          query = query
            .order("title_display", { ascending: true })
            .order("created_at", { ascending: false });
          break;
        case "name_desc":
          query = query
            .order("title_display", { ascending: false })
            .order("created_at", { ascending: false });
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        throw error;
      }

      ids = (data ?? []).map((row: { id: string }) => row.id);
      total = count ?? 0;
    }
    if (ids.length === 0) {
      return { products: [], total, page, limit };
    }

    let detailQuery = this.supabase
      .from("products")
      .select(
        "*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))",
      )
      .in("id", ids)
      .eq("is_active", true);

    if (filters.stockStatus === "out_of_stock") {
      detailQuery = detailQuery.eq("is_out_of_stock", true);
    } else if (filters.stockStatus === "in_stock") {
      detailQuery = detailQuery.eq("is_out_of_stock", false);
    } else if (!includeOutOfStock) {
      detailQuery = detailQuery.eq("is_out_of_stock", false);
    }

    if (filters.tenantId) {
      detailQuery = detailQuery.eq("tenant_id", filters.tenantId);
    }
    if (filters.sellerId) {
      detailQuery = detailQuery.eq("seller_id", filters.sellerId);
    }
    if (filters.marketplaceId) {
      detailQuery = detailQuery.eq("marketplace_id", filters.marketplaceId);
    }

    const { data: details, error: detailsError } = await detailQuery;

    if (detailsError) {
      throw detailsError;
    }

    const byId = new Map(
      (details ?? []).map((raw) => [
        raw.id,
        this.transformProduct(raw as ProductWithRelations),
      ]),
    );

    return {
      products: ids.map((id) => byId.get(id)).filter(Boolean) as ProductWithDetails[],
      total,
      page,
      limit,
    };
  }

  async getById(
    id: string,
    opts?: Pick<
      ProductFilters,
      "tenantId" | "sellerId" | "marketplaceId" | "includeOutOfStock"
    >,
  ): Promise<ProductWithDetails | null> {
    let query = this.supabase
      .from("products")
      .select(
        "*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))",
      )
      .eq("id", id)
      .eq("is_active", true);

    if (!opts?.includeOutOfStock) {
      query = query.eq("is_out_of_stock", false);
    }
    if (opts?.tenantId) {
      query = query.eq("tenant_id", opts.tenantId);
    }
    if (opts?.sellerId) {
      query = query.eq("seller_id", opts.sellerId);
    }
    if (opts?.marketplaceId) {
      query = query.eq("marketplace_id", opts.marketplaceId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    return this.transformProduct(data as ProductWithRelations);
  }

  async findByTitleAndCategory(
    titleRaw: string,
    category: string,
    tenantId?: string,
  ): Promise<ProductRow | null> {
    let query = this.supabase
      .from("products")
      .select("*")
      .eq("title_raw", titleRaw)
      .eq("category", category)
      .eq("is_active", true);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      throw error;
    }
    return data ?? null;
  }

  async create(product: ProductInsert) {
    const { data, error } = await this.supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as ProductRow;
  }

  async update(id: string, product: ProductUpdate) {
    const { data, error } = await this.supabase
      .from("products")
      .update(product)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as ProductRow;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from("products").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }

  async createVariant(variant: VariantInsert) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .insert(variant)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as VariantRow;
  }

  async updateVariant(id: string, variant: VariantUpdate) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .update(variant)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as VariantRow;
  }

  async deleteVariantsByProduct(productId: string) {
    const { error } = await this.supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (error) {
      throw error;
    }
  }

  async createImage(image: ImageInsert) {
    const { data, error } = await this.supabase
      .from("product_images")
      .insert(image)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as ImageRow;
  }

  async deleteImagesByProduct(productId: string) {
    const { error } = await this.supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);

    if (error) {
      throw error;
    }
  }

  async upsertTag(tag: TagInsert) {
    const { data, error } = await this.supabase
      .from("tags")
      .upsert(tag, { onConflict: "tenant_id,label,group_key" })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as TagRow;
  }

  async linkProductTag(productId: string, tagId: string) {
    const { error } = await this.supabase
      .from("product_tags")
      .insert({ product_id: productId, tag_id: tagId });

    if (error && (error as { code?: string }).code !== "23505") {
      throw error;
    }
  }

  async unlinkProductTags(productId: string) {
    const { error } = await this.supabase
      .from("product_tags")
      .delete()
      .eq("product_id", productId);

    if (error) {
      throw error;
    }
  }

  async getBrands(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("products")
      .select("brand")
      .eq("is_active", true)
      .eq("is_out_of_stock", false);

    if (error) {
      throw error;
    }
    const brands = [
      ...new Set(
        (data ?? [])
          .map((p) => p.brand)
          .filter((brand): brand is string => Boolean(brand)),
      ),
    ];
    return brands.sort();
  }

  async listFilterData(opts?: { includeOutOfStock?: boolean }): Promise<FilterDataRow[]> {
    const includeOutOfStock = Boolean(opts?.includeOutOfStock);
    let query = this.supabase
      .from("products")
      .select("brand, model, brand_is_verified, model_is_verified, category")
      .eq("is_active", true);

    if (!includeOutOfStock) {
      query = query.eq("is_out_of_stock", false);
    }

    const { data, error } = await query.limit(2000);

    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => ({
      brand: row.brand ?? null,
      model: row.model ?? null,
      brand_is_verified: row.brand_is_verified ?? null,
      model_is_verified: row.model_is_verified ?? null,
      category: row.category ?? null,
    }));
  }

  async listAvailableSizes(filters?: ProductFilters) {
    const includeOutOfStock = Boolean(filters?.includeOutOfStock);
    let query = this.supabase
      .from("product_variants")
      .select("size_label, size_type, product:products!inner(is_active, is_out_of_stock)")
      .gt("stock", 0)
      .eq("product.is_active", true);

    if (filters?.tenantId) {
      query = query.eq("product.tenant_id", filters.tenantId);
    }
    if (filters?.sellerId) {
      query = query.eq("product.seller_id", filters.sellerId);
    }
    if (filters?.marketplaceId) {
      query = query.eq("product.marketplace_id", filters.marketplaceId);
    }

    if (filters?.stockStatus === "out_of_stock") {
      query = query.eq("product.is_out_of_stock", true);
    } else if (filters?.stockStatus === "in_stock") {
      query = query.eq("product.is_out_of_stock", false);
    } else if (!includeOutOfStock) {
      query = query.eq("product.is_out_of_stock", false);
    }

    query = this.applyTextSearch(query, filters?.q, this.storefrontSearchFields, {
      foreignTable: "product",
    });

    if (filters?.category?.length) {
      query = query.in("product.category", filters.category);
    }
    if (filters?.brand?.length) {
      query = query.in("product.brand", filters.brand);
    }
    if (filters?.model?.length) {
      query = query.in("product.model", filters.model);
    }
    if (filters?.condition?.length) {
      query = query.in("product.condition", filters.condition);
    }

    if (filters?.sizeShoe?.length || filters?.sizeClothing?.length) {
      const sizeFilters: string[] = [];
      if (filters.sizeShoe?.length) {
        sizeFilters.push(
          `and(size_type.eq.shoe,size_label.in.(${this.buildInClause(filters.sizeShoe)}))`,
        );
      }
      if (filters.sizeClothing?.length) {
        sizeFilters.push(
          `and(size_type.eq.clothing,size_label.in.(${this.buildInClause(
            filters.sizeClothing,
          )}))`,
        );
      }
      if (sizeFilters.length > 0) {
        query = query.or(sizeFilters.join(","));
      }
    }

    const { data, error } = await query.limit(5000);

    if (error) {
      throw error;
    }

    const shoe = new Set<string>();
    const clothing = new Set<string>();

    for (const row of (data ?? []) as SizeAvailabilityRow[]) {
      const sizeLabel = row.size_label?.trim();
      if (!sizeLabel) {
        continue;
      }
      if (row.size_type === "shoe") {
        shoe.add(sizeLabel);
      } else if (row.size_type === "clothing") {
        clothing.add(sizeLabel);
      }
    }

    return { shoe: Array.from(shoe), clothing: Array.from(clothing) };
  }

  async listAvailableConditions(filters?: ProductFilters) {
    const includeOutOfStock = Boolean(filters?.includeOutOfStock);
    let query = this.supabase
      .from("product_variants")
      .select(
        "size_label, size_type, product:products!inner(condition, is_active, is_out_of_stock)",
      )
      .gt("stock", 0)
      .eq("product.is_active", true);

    if (filters?.tenantId) {
      query = query.eq("product.tenant_id", filters.tenantId);
    }
    if (filters?.sellerId) {
      query = query.eq("product.seller_id", filters.sellerId);
    }
    if (filters?.marketplaceId) {
      query = query.eq("product.marketplace_id", filters.marketplaceId);
    }

    if (filters?.stockStatus === "out_of_stock") {
      query = query.eq("product.is_out_of_stock", true);
    } else if (filters?.stockStatus === "in_stock") {
      query = query.eq("product.is_out_of_stock", false);
    } else if (!includeOutOfStock) {
      query = query.eq("product.is_out_of_stock", false);
    }

    query = this.applyTextSearch(query, filters?.q, this.storefrontSearchFields, {
      foreignTable: "product",
    });

    if (filters?.category?.length) {
      query = query.in("product.category", filters.category);
    }
    if (filters?.brand?.length) {
      query = query.in("product.brand", filters.brand);
    }
    if (filters?.model?.length) {
      query = query.in("product.model", filters.model);
    }
    if (filters?.condition?.length) {
      query = query.in("product.condition", filters.condition);
    }

    if (filters?.sizeShoe?.length || filters?.sizeClothing?.length) {
      const sizeFilters: string[] = [];
      if (filters.sizeShoe?.length) {
        sizeFilters.push(
          `and(size_type.eq.shoe,size_label.in.(${this.buildInClause(filters.sizeShoe)}))`,
        );
      }
      if (filters.sizeClothing?.length) {
        sizeFilters.push(
          `and(size_type.eq.clothing,size_label.in.(${this.buildInClause(
            filters.sizeClothing,
          )}))`,
        );
      }
      if (sizeFilters.length > 0) {
        query = query.or(sizeFilters.join(","));
      }
    }

    const { data, error } = await query.limit(5000);

    if (error) {
      throw error;
    }

    const conditions = new Set<string>();
    for (const row of (data ?? []) as Array<{
      product?: { condition?: string | null };
    }>) {
      const condition = row?.product?.condition;
      if (condition) {
        conditions.add(condition);
      }
    }

    return Array.from(conditions);
  }

  private transformProduct(raw: ProductWithRelations): ProductWithDetails {
    const variants = Array.isArray(raw.variants) ? raw.variants : [];
    const images = Array.isArray(raw.images) ? raw.images : [];
    const tags = Array.isArray(raw.tags) ? raw.tags : [];

    return {
      ...(raw as ProductRow),
      variants: variants as VariantRow[],
      images: (images as ImageRow[]).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      ),
      tags: tags
        .map((pt) => {
          if (pt && typeof pt === "object" && "tag" in pt) {
            return pt.tag;
          }
          return null;
        })
        .filter((tag): tag is TagRow => tag !== null && tag !== undefined),
    };
  }

  private applyTextSearch<
    Query extends {
      or: (
        filters: string,
        opts?: { foreignTable?: string; referencedTable?: string },
      ) => Query;
    },
  >(
    query: Query,
    input: string | undefined,
    fields: string[],
    opts?: { foreignTable?: string; referencedTable?: string },
  ): Query {
    const terms = this.buildSearchTerms(input);
    if (terms.length === 0) {
      return query;
    }

    const clauses: string[] = [];
    for (const term of terms) {
      const safe = term.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
      if (!safe) {
        continue;
      }
      for (const field of fields) {
        clauses.push(`${field}.ilike.%${safe}%`);
      }
    }

    if (clauses.length === 0) {
      return query;
    }

    return query.or(clauses.join(","), opts) as Query;
  }

  private buildSearchTerms(input?: string): string[] {
    if (!input) {
      return [];
    }

    const normalized = input.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const terms = new Set<string>();
    const addTerm = (value: string) => {
      const next = value.trim();
      if (next.length >= 2) {
        terms.add(next);
      }
    };

    addTerm(normalized);

    const tokens = normalized.split(/\s+/);
    for (const token of tokens) {
      const cleaned = token.replace(/[^a-z0-9]/g, "");
      if (!cleaned) {
        continue;
      }

      addTerm(cleaned);

      if (cleaned.endsWith("ies") && cleaned.length > 4) {
        addTerm(`${cleaned.slice(0, -3)}y`);
      } else if (cleaned.endsWith("es") && cleaned.length > 4) {
        addTerm(cleaned.slice(0, -2));
      } else if (cleaned.endsWith("s") && cleaned.length > 3) {
        addTerm(cleaned.slice(0, -1));
      }
    }

    return Array.from(terms).slice(0, 8);
  }

  private buildInClause(values: string[]) {
    return values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",");
  }

  private async listProductIdsByPrice(
    filters: ProductFilters,
    sort: "price_asc" | "price_desc",
    includeOutOfStock: boolean,
  ) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const hasSizeFilters = Boolean(
      filters.sizeShoe?.length || filters.sizeClothing?.length,
    );

    let sizeProductIds: string[] | null = null;
    if (hasSizeFilters) {
      sizeProductIds = await this.listProductIdsForSizes(filters);
      if (Array.isArray(sizeProductIds) && sizeProductIds.length === 0) {
        return { ids: [], total: 0 };
      }
    }

    let countQuery = this.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    // Tenant/seller/marketplace scoping
    if (filters.tenantId) {
      countQuery = countQuery.eq("tenant_id", filters.tenantId);
    }
    if (filters.sellerId) {
      countQuery = countQuery.eq("seller_id", filters.sellerId);
    }
    if (filters.marketplaceId) {
      countQuery = countQuery.eq("marketplace_id", filters.marketplaceId);
    }

    if (filters.stockStatus === "out_of_stock") {
      countQuery = countQuery.eq("is_out_of_stock", true);
    } else if (filters.stockStatus === "in_stock") {
      countQuery = countQuery.eq("is_out_of_stock", false);
    } else if (!includeOutOfStock) {
      countQuery = countQuery.eq("is_out_of_stock", false);
    }

    // Text search
    countQuery = this.applyTextSearch(
      countQuery,
      filters.q,
      this.storefrontSearchFields,
    );

    // Category / brand / condition filters
    if (filters.category?.length) {
      countQuery = countQuery.in("category", filters.category);
    }
    if (filters.brand?.length) {
      countQuery = countQuery.in("brand", filters.brand);
    }
    if (filters.model?.length) {
      countQuery = countQuery.in("model", filters.model);
    }
    if (filters.condition?.length) {
      countQuery = countQuery.in("condition", filters.condition);
    }
    if (Array.isArray(sizeProductIds)) {
      countQuery = countQuery.in("id", sizeProductIds);
    }

    const { count: total, error: countError } = await countQuery;
    if (countError) {
      throw countError;
    }
    if (!total) {
      return { ids: [], total: 0 };
    }

    const targetCount = offset + limit;
    const batchSize = Math.max(limit * 6, 120);
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    let rangeStart = 0;

    while (orderedIds.length < targetCount) {
      let query = this.supabase
        .from("product_variants")
        .select("product_id, price_cents, product:products!inner(id)")
        .order("price_cents", { ascending: sort === "price_asc" })
        .order("product_id", { ascending: true })
        .range(rangeStart, rangeStart + batchSize - 1);

      if (!includeOutOfStock) {
        query = query.gt("stock", 0);
      }

      if (filters.sizeShoe?.length || filters.sizeClothing?.length) {
        const sizeFilters: string[] = [];
        if (filters.sizeShoe?.length) {
          sizeFilters.push(
            `and(size_type.eq.shoe,size_label.in.(${this.buildInClause(filters.sizeShoe)}))`,
          );
        }
        if (filters.sizeClothing?.length) {
          sizeFilters.push(
            `and(size_type.eq.clothing,size_label.in.(${this.buildInClause(filters.sizeClothing)}))`,
          );
        }
        if (sizeFilters.length > 0) {
          query = query.or(sizeFilters.join(","));
        }
      }

      // Tenant/seller/marketplace scoping
      if (filters.tenantId) {
        query = query.eq("product.tenant_id", filters.tenantId);
      }
      if (filters.sellerId) {
        query = query.eq("product.seller_id", filters.sellerId);
      }
      if (filters.marketplaceId) {
        query = query.eq("product.marketplace_id", filters.marketplaceId);
      }

      if (filters.stockStatus === "out_of_stock") {
        query = query.eq("product.is_out_of_stock", true);
      } else if (filters.stockStatus === "in_stock") {
        query = query.eq("product.is_out_of_stock", false);
      } else if (!includeOutOfStock) {
        query = query.eq("product.is_out_of_stock", false);
      }

      query = query.eq("product.is_active", true);

      // Text search on product fields
      query = this.applyTextSearch(query, filters.q, this.storefrontSearchFields, {
        foreignTable: "product",
      });

      // Category / brand / condition filters
      if (filters.category?.length) {
        query = query.in("product.category", filters.category);
      }
      if (filters.brand?.length) {
        query = query.in("product.brand", filters.brand);
      }
      if (filters.model?.length) {
        query = query.in("product.model", filters.model);
      }
      if (filters.condition?.length) {
        query = query.in("product.condition", filters.condition);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      for (const row of data ?? []) {
        const variantRow = row as VariantWithProduct;
        const productId = variantRow.product_id;
        if (!productId || seen.has(productId)) {
          continue;
        }
        seen.add(productId);
        orderedIds.push(productId);
        if (orderedIds.length >= targetCount) {
          break;
        }
      }

      if (data.length < batchSize) {
        break;
      }
      rangeStart += batchSize;
    }

    return { ids: orderedIds.slice(offset, offset + limit), total };
  }

  private async listProductIdsForSizes(filters: ProductFilters) {
    const sizeFilters: string[] = [];
    if (filters.sizeShoe?.length) {
      sizeFilters.push(
        `and(size_type.eq.shoe,size_label.in.(${this.buildInClause(filters.sizeShoe)}))`,
      );
    }
    if (filters.sizeClothing?.length) {
      sizeFilters.push(
        `and(size_type.eq.clothing,size_label.in.(${this.buildInClause(filters.sizeClothing)}))`,
      );
    }

    if (sizeFilters.length === 0) {
      return null;
    }

    const { data, error } = await this.supabase
      .from("product_variants")
      .select("product_id")
      .or(sizeFilters.join(","))
      .gt("stock", 0);

    if (error) {
      throw error;
    }

    return [
      ...new Set(
        (data ?? [])
          .map((row) => row.product_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
  }

  async getProductsForCheckout(productIds: string[]): Promise<
    Array<{
      id: string;
      name: string;
      brand: string;
      model: string | null;
      titleDisplay: string;
      category: string;
      tenantId: string | null;
      defaultShippingPrice: number;
      shippingOverrideCents: number | null;
      variants: Array<{
        id: string;
        sizeLabel: string;
        priceCents: number;
        costCents: number | null;
        stock: number;
      }>;
    }>
  > {
    const { data, error } = await this.supabase
      .from("products")
      .select(
        "id, name, brand, model, title_display, category, tenant_id, default_shipping_price, shipping_override_cents, variants:product_variants(id, size_label, price_cents, cost_cents, stock)",
      )
      .in("id", productIds)
      .eq("is_active", true)
      .eq("is_out_of_stock", false);

    if (error) {
      throw error;
    }

    return (data ?? []).map((p: CheckoutProductRow) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      model: p.model ?? null,
      titleDisplay: p.title_display,
      category: p.category,
      tenantId: p.tenant_id ?? null,
      defaultShippingPrice: p.default_shipping_price ?? 0,
      shippingOverrideCents: p.shipping_override_cents ?? null,
      variants: (p.variants ?? []).map((v) => ({
        id: v.id,
        sizeLabel: v.size_label,
        priceCents: v.price_cents,
        costCents: v.cost_cents ?? null,
        stock: v.stock,
      })),
    }));
  }

  async getVariantsForCart(variantIds: string[]): Promise<CartVariantDetails[]> {
    if (variantIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("product_variants")
      .select(
        "id, product_id, size_label, price_cents, stock, product:products(id, brand, name, title_raw, title_display, is_active, is_out_of_stock)",
      )
      .in("id", variantIds);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const productIds = [
      ...new Set(
        rows
          .map((row: CartVariantRow) => row.product?.id ?? row.product_id)
          .filter((id: string | null): id is string => Boolean(id)),
      ),
    ];

    const imageMap = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: images, error: imagesError } = await this.supabase
        .from("product_images")
        .select("product_id, url, is_primary, sort_order")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });

      if (imagesError) {
        throw imagesError;
      }

      for (const image of images ?? []) {
        const img = image as ProductImageRow;
        if (!imageMap.has(img.product_id)) {
          imageMap.set(img.product_id, img.url);
        }
      }
    }

    return rows.map((row: CartVariantRow) => {
      const product = row.product;
      return {
        variantId: row.id,
        productId: product?.id ?? row.product_id,
        sizeLabel: row.size_label,
        priceCents: row.price_cents,
        stock: row.stock,
        brand: product?.brand ?? "",
        name: product?.name ?? "",
        titleDisplay:
          product?.title_raw ??
          product?.title_display ??
          `${product?.brand ?? ""} ${product?.name ?? ""}`.trim(),
        isActive: product?.is_active ?? false,
        isOutOfStock: product?.is_out_of_stock ?? false,
        imageUrl: imageMap.get(product?.id ?? row.product_id) ?? null,
      };
    });
  }

  async getModels(category?: string): Promise<string[]> {
    let query = this.supabase
      .from("products")
      .select("model")
      .eq("is_active", true)
      .eq("is_out_of_stock", false)
      .not("model", "is", null);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const models = [
      ...new Set(
        (data ?? [])
          .map((p) => p.model)
          .filter((model): model is string => Boolean(model)),
      ),
    ];
    return models.sort();
  }
}
