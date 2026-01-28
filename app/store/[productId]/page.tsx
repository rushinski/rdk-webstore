// app/store/[productId]/page.tsx

import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { ProductRepository } from "@/repositories/product-repo";
import { ProductDetail } from "@/components/store/ProductDetail";

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
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
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

  const fromParam = searchParams?.from;
  const fromValue = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const decodedFrom = (() => {
    if (!fromValue) {
      return undefined;
    }
    if (fromValue.startsWith("/store")) {
      return fromValue;
    }
    try {
      return decodeURIComponent(fromValue);
    } catch {
      return fromValue;
    }
  })();
  const backHref =
    decodedFrom && decodedFrom.startsWith("/store") ? decodedFrom : "/store";

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
