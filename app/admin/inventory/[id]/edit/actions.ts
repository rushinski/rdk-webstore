// app/admin/inventory/[id]/edit/actions.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ProductService } from "@/services/product-service";
import { ShippingDefaultsService } from "@/services/shipping-defaults-service";
import { ensureTenantId } from "@/lib/auth/tenant";

export async function getEditFormInitialData(productId: string) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);

    const productService = new ProductService(supabase);
    const catalogRepo = new CatalogRepository(supabase);
    const shippingDefaultsService = new ShippingDefaultsService(supabase);

    // Fetch product, shipping defaults, and brands in parallel using direct service calls
    const [product, shippingDefaults, brandsData] = await Promise.all([
      productService.getProductById(productId, {
        tenantId,
        includeOutOfStock: true,
      }),
      shippingDefaultsService.list(tenantId),
      catalogRepo.listBrandsWithGroups(tenantId),
    ]);

    return {
      product,
      shippingDefaults: shippingDefaults || [],
      brands: brandsData.map(
        (brand: {
          id: string;
          canonical_label: string;
          group?: { key: string } | null;
        }) => ({
          id: brand.id,
          label: brand.canonical_label,
          groupKey: brand.group?.key ?? null,
        }),
      ),
    };
  } catch (error) {
    console.error("[getEditFormInitialData] Error:", error);
    throw error; // Re-throw so Next.js shows proper error
  }
}
