// src/components/store/ProductCard.tsx
/**
 * ProductCard - Optimized for processed images
 * 
 * Images are already processed to 1200x1200 WebP on upload,
 * so we just display them directly with Next.js Image optimization.
 * 
 * No Cloudinary needed - everything is handled by Supabase + Sharp.
 */

import Link from "next/link";
import Image from "next/image";

import type { ProductWithDetails } from "@/types/domain/product";

interface ProductCardProps {
  product: ProductWithDetails;
  storeHref?: string;
  priority?: boolean;
}

export function ProductCard({ product, storeHref, priority = false }: ProductCardProps) {
  const primaryImage = product.images.find((img) => img.is_primary) || product.images[0];
  const variants = product.variants;

  const priceMin = Math.min(...variants.map((v) => v.price_cents));
  const priceMax = Math.max(...variants.map((v) => v.price_cents));
  const isRange = priceMin !== priceMax;

  const fullPriceDisplay =
    priceMin === priceMax
      ? `$${(priceMin / 100).toFixed(2)}`
      : `$${(priceMin / 100).toFixed(2)} - $${(priceMax / 100).toFixed(2)}`;

  const priceDisplay = isRange
    ? `From $${(priceMin / 100).toFixed(2)}`
    : fullPriceDisplay;

  const sizeDisplay =
    variants.length === 1
      ? variants[0].size_label === "N/A"
        ? "No size"
        : variants[0].size_label
      : "Multiple";

  const conditionBadge =
    product.condition === "new" ? (
      <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full border border-zinc-900 shadow-sm">
        NEW
      </span>
    ) : product.condition === "used" ? (
      <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full border border-zinc-900 shadow-sm">
        PRE-OWNED
      </span>
    ) : null;

  const productHref = storeHref
    ? `/store/${product.id}?from=${encodeURIComponent(storeHref)}`
    : `/store/${product.id}`;

  // Image is already processed to 1200x1200 WebP on upload
  // Just use it directly - Next.js Image will handle responsive sizing
  const imageUrl = primaryImage?.url || null;

  return (
    <Link
      href={productHref}
      className="group block h-full"
      data-testid="product-card"
      data-product-id={product.id}
      prefetch={priority}
    >
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden hover:border-zinc-600/70 transition flex h-full flex-col">
        <div className="aspect-square relative bg-zinc-800">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={product.title_display ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              quality={90}
              // Image is already optimized WebP from Sharp processing
              // Next.js will serve appropriate sizes based on device
            />
          )}

          {conditionBadge && (
            <div className="absolute top-2 right-2 z-10">{conditionBadge}</div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
            <h3 className="text-white font-bold text-sm truncate flex-1">
              {product.title_raw ?? `${product.brand} ${product.name}`.trim()}
            </h3>
          </div>

          <p
            className="mt-1 text-gray-400 text-xs truncate"
            title={`Size: ${sizeDisplay}`}
          >
            {sizeDisplay}
          </p>

          <div className="mt-auto pt-3">
            <span
              className="text-white font-extrabold text-lg whitespace-nowrap tabular-nums"
              title={fullPriceDisplay}
            >
              {priceDisplay}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}