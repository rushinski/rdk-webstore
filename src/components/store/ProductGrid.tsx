// src/components/store/ProductGrid.tsx
// OPTIMIZED VERSION - Priority loading for visible products
import type { ProductWithDetails } from "@/types/domain/product";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: ProductWithDetails[];
  storeHref?: string;
}

// OPTIMIZATION: Mark first 8 products as priority for LCP
const PRIORITY_CARDS_COUNT = 8;

export function ProductGrid({ products, storeHref }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No products found</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="product-grid"
    >
      {products.map((product, index) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          storeHref={storeHref}
          priority={index < PRIORITY_CARDS_COUNT}
        />
      ))}
    </div>
  );
}