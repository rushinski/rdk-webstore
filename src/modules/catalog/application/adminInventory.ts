"use server";

import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogRepository } from "@/modules/catalog/infrastructure/catalog-repo";
import { ProductService } from "@/modules/catalog/infrastructure/product-service";
import { ShippingDefaultsService } from "@/modules/catalog/infrastructure/shipping-defaults-service";
import type { Category, Condition } from "@/types/domain/product";
import type {
  CreateProductFormInitialData,
  EditProductFormInitialData,
} from "@/modules/catalog/presentation/admin/inventory/productEditorTypes";

type StockStatus = "in_stock" | "archived";

export interface InventoryFilters {
  q?: string;
  category?: Category | "all";
  condition?: Condition | "all";
  stockStatus?: StockStatus;
  page?: number;
  limit?: number;
}

export async function getCreateProductFormInitialData(): Promise<CreateProductFormInitialData> {
  const session = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);

  const catalogRepo = new CatalogRepository(supabase);
  const shippingDefaultsService = new ShippingDefaultsService(supabase);

  const [shippingDefaults, brandsData] = await Promise.all([
    shippingDefaultsService.list(tenantId),
    catalogRepo.listBrandsWithGroups(tenantId),
  ]);

  return {
    shippingDefaults: shippingDefaults || [],
    brands: brandsData.map((brand) => ({
      id: brand.id,
      label: brand.canonical_label,
      groupKey: brand.group?.key ?? null,
    })),
  };
}

export async function getEditProductFormInitialData(
  productId: string,
): Promise<EditProductFormInitialData> {
  const session = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);

  const productService = new ProductService(supabase);
  const catalogRepo = new CatalogRepository(supabase);
  const shippingDefaultsService = new ShippingDefaultsService(supabase);

  const [product, shippingDefaults, brandsData] = await Promise.all([
    productService.getProductById(productId, {
      tenantId,
      includeOutOfStock: true,
      includeUnpublished: true,
      archivedStatus: "all",
    }),
    shippingDefaultsService.list(tenantId),
    catalogRepo.listBrandsWithGroups(tenantId),
  ]);

  return {
    product,
    shippingDefaults: shippingDefaults || [],
    brands: brandsData.map((brand) => ({
      id: brand.id,
      label: brand.canonical_label,
      groupKey: brand.group?.key ?? null,
    })),
  };
}

export async function getInventoryProducts(filters: InventoryFilters = {}) {
  const session = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);

  const service = new ProductService(supabase);

  const {
    q,
    category,
    condition,
    stockStatus = "in_stock",
    page = 1,
    limit = 100,
  } = filters;

  return service.listProducts({
    q,
    category: category && category !== "all" ? [category] : undefined,
    condition: condition && condition !== "all" ? [condition] : undefined,
    limit,
    page,
    includeOutOfStock: true,
    stockStatus,
    tenantId,
    searchMode: "inventory",
  });
}
