// src/components/store/ProductCard.tsx
// OPTIMIZED VERSION - Better image loading and performance

import Link from "next/link";
import Image from "next/image";

import type { ProductWithDetails } from "@/types/domain/product";

interface ProductCardProps {
  product: ProductWithDetails;
  storeHref?: string;
  priority?: boolean; // For above-the-fold images
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

  return (
    <Link
      href={productHref}
      className="group block h-full"
      data-testid="product-card"
      data-product-id={product.id}
      // OPTIMIZATION 1: Add prefetch only for visible cards
      prefetch={priority}
    >
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden hover:border-zinc-600/70 transition flex h-full flex-col">
        <div className="aspect-square relative bg-zinc-800">
          {primaryImage && (
            <Image
              src={primaryImage.url}
              alt={product.title_raw ?? product.title_display ?? product.name}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              // OPTIMIZATION 2: Priority for first 8 cards, lazy for rest
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              // OPTIMIZATION 3: Lower quality for thumbnails
              quality={75}
              // OPTIMIZATION 4: Use placeholder for better LCP
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F9PQAI8wNPvd7POQAAAABJRU5ErkJggg=="
            />
          )}

          {conditionBadge && (
            <div className="absolute top-2 right-2 z-10">{conditionBadge}</div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          {/* Title */}
          <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
            <h3 className="text-white font-bold text-sm truncate flex-1">
              {product.title_raw ?? `${product.brand} ${product.name}`.trim()}
            </h3>
          </div>

          {/* Size under title */}
          <p
            className="mt-1 text-gray-400 text-xs truncate"
            title={`Size: ${sizeDisplay}`}
          >
            {sizeDisplay}
          </p>

          {/* Price at bottom, bigger */}
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
