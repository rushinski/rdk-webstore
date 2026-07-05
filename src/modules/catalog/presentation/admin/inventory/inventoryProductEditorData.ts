"use server";

import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ProductService } from "@/services/product-service";
import { ShippingDefaultsService } from "@/services/shipping-defaults-service";
import type {
  CreateProductFormInitialData,
  EditProductFormInitialData,
} from "@/modules/catalog/presentation/admin/inventory/productEditorTypes";

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
