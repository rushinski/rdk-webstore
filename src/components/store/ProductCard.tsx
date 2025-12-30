// src/components/store/ProductCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import type { ProductWithDetails } from "@/types/views/product";

interface ProductCardProps {
  product: ProductWithDetails;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
  const variants = product.variants;
  
  const priceMin = Math.min(...variants.map(v => v.price_cents));
  const priceMax = Math.max(...variants.map(v => v.price_cents));
  const priceDisplay = priceMin === priceMax
    ? `$${(priceMin / 100).toFixed(2)}`
    : `$${(priceMin / 100).toFixed(2)} - $${(priceMax / 100).toFixed(2)}`;

  const sizeDisplay = variants.length === 1
    ? (variants[0].size_label === 'N/A' ? 'No size' : variants[0].size_label)
    : 'Multiple sizes';

  return (
    <Link href={`/store/${product.id}`} className="group block h-full">
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden hover:border-red-600/40 transition flex h-full flex-col">
        <div className="aspect-square relative bg-zinc-800">
          {primaryImage && (
            <Image
              src={primaryImage.url}
              alt={product.title_display ?? product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {product.condition === 'new' && (
            <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
              NEW
            </span>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <h3 className="text-white font-bold text-sm truncate min-h-[1.5rem]">
            {product.title_display ?? `${product.brand} ${product.name}`.trim()}
          </h3>
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-gray-400 text-xs">Size: {sizeDisplay}</span>
            <span className="text-white font-bold text-sm">{priceDisplay}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

