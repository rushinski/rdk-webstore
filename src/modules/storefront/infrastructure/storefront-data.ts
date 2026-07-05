import { unstable_cache } from "next/cache";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/modules/storefront/infrastructure/product-repo";
import { StorefrontService } from "@/modules/storefront/infrastructure/storefront-service";

const PRODUCT_REVALIDATE_SECONDS = 60;

export function createStorefrontService() {
  const supabase = createSupabasePublicClient();
  return new StorefrontService(supabase);
}

export async function createServerStorefrontService() {
  const supabase = await createSupabaseServerClient();
  return new StorefrontService(supabase);
}

export const getCachedStoreProduct = (productId: string) =>
  unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
      const repo = new ProductRepository(supabase);
      return repo.getById(productId);
    },
    ["storefront", "product", productId],
    { revalidate: PRODUCT_REVALIDATE_SECONDS, tags: [`product:${productId}`] },
  )();
