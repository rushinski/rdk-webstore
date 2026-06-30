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

  const priceMin = Math.min(...variants.map((v) => v.sale_price_cents));
  const priceMax = Math.max(...variants.map((v) => v.sale_price_cents));
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
    product.condition === "new"
      ? "NEW"
      : product.condition === "used"
        ? "PRE-OWNED"
        : null;

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
      <div className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden bg-brand-page">
          {primaryImage && (
            <Image
              src={primaryImage.url}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              // OPTIMIZATION 2: Priority for first 8 cards, lazy for rest
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              // OPTIMIZATION 3: Lower quality for thumbnails
              quality={75}
              // OPTIMIZATION 4: Use placeholder for better LCP
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F9PQAI8wNPvd7POQAAAABJRU5ErkJggg=="
            />
          )}

          {conditionBadge && (
            <div className="absolute right-2 top-2 z-10 border border-brand-border bg-brand-surface px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-brand-text">
              {conditionBadge}
            </div>
          )}
        </div>

        <div className="pt-3">
          <div className="text-xs uppercase tracking-[0.06em] text-brand-muted">
            {product.brand || sizeDisplay}
          </div>
          <h3 className="mt-0.5 text-xs uppercase leading-snug text-brand-text">
            {product.name}
          </h3>
          <div
            className="mt-1 text-sm font-medium text-brand-text"
            title={fullPriceDisplay}
          >
            {priceDisplay}
          </div>
        </div>
      </div>
    </Link>
  );
}
