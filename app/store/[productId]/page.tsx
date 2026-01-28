// app/store/[productId]/page.tsx

import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { ProductRepository } from "@/repositories/product-repo";
import { ProductDetail } from "@/components/store/ProductDetail";
import { BackToStoreLink } from "@/components/store/BackToStoreLink";

const PRODUCT_REVALIDATE_SECONDS = 60;
export const revalidate = 60;

const getCachedProduct = (productId: string) =>
  unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
      const repo = new ProductRepository(supabase);
      return repo.getById(productId);
    },
    ["storefront", "product", productId],
    { revalidate: PRODUCT_REVALIDATE_SECONDS, tags: [`product:${productId}`] },
  )();

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const isUuid =
    typeof productId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productId,
    );
  if (!isUuid) {
    notFound();
  }

  const product = await getCachedProduct(productId);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <BackToStoreLink />
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
