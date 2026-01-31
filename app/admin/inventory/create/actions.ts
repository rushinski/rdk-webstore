// app/admin/inventory/create/actions.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CatalogRepository } from "@/repositories/catalog-repo";
import { ShippingDefaultsService } from "@/services/shipping-defaults-service";
import { ensureTenantId } from "@/lib/auth/tenant";

export async function getFormInitialData() {
  const session = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);

  const catalogRepo = new CatalogRepository(supabase);
  const shippingDefaultsService = new ShippingDefaultsService(supabase);

  // Fetch shipping defaults and brands in parallel using direct service calls
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
