import { notFound } from "next/navigation";

import { BackToStoreLink } from "@/components/store/BackToStoreLink";
import { ProductDetail } from "@/components/store/ProductDetail";
import { getCachedStoreProduct } from "@/modules/storefront/infrastructure/storefront-data";
import { isStoreProductId } from "@/modules/storefront/application/storefront-product";

export async function StoreProductDetailPageContent({
  productId,
}: {
  productId: string;
}) {
  if (!isStoreProductId(productId)) {
    notFound();
  }

  const product = await getCachedStoreProduct(productId);
  if (!product) {
    notFound();
  }

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-4">
        <BackToStoreLink />
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
