import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";

export async function syncLightspeedInventoryForVariants(input: {
  supabase: TypedSupabaseClient;
  tenantId: string;
  variantIds: string[];
  websiteModifiedAt?: string;
}) {
  const variantIds = [...new Set(input.variantIds.filter(Boolean))];
  if (variantIds.length === 0) {
    return;
  }

  const productRepo = new ProductRepository(input.supabase);
  const syncService = new LightspeedProductSyncService(input.supabase);
  const variants = await productRepo.getVariantsForCart(variantIds);
  const modifiedAt = input.websiteModifiedAt ?? new Date().toISOString();

  for (const variant of variants) {
    await syncService.syncVariantInventory({
      tenantId: input.tenantId,
      variantId: variant.variantId,
      stock: variant.stock,
      websiteModifiedAt: modifiedAt,
    });
  }
}
