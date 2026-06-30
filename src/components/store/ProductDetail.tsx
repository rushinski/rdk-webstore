"use client";

import type { ProductWithDetails } from "@/types/domain/product";
import { ProductImageGallery } from "@/components/storefront/product/ProductImageGallery";
import { ProductPurchasePanel } from "@/components/storefront/product/ProductPurchasePanel";

interface ProductDetailProps {
  product: ProductWithDetails;
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[1fr_1fr]">
      <ProductImageGallery product={product} />
      <ProductPurchasePanel product={product} />
    </div>
  );
}
