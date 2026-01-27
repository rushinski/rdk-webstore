// src/components/store/ProductCard.tsx

import Link from "next/link";
import Image from "next/image";

import type { ProductWithDetails } from "@/types/domain/product";

interface ProductCardProps {
  product: ProductWithDetails;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images.find((img) => img.is_primary) || product.images[0];
  const variants = product.variants;

  const priceMin = Math.min(...variants.map((v) => v.price_cents));
  const priceMax = Math.max(...variants.map((v) => v.price_cents));
  const priceDisplay =
    priceMin === priceMax
      ? `$${(priceMin / 100).toFixed(2)}`
      : `$${(priceMin / 100).toFixed(2)} - $${(priceMax / 100).toFixed(2)}`;

  const sizeDisplay =
    variants.length === 1
      ? variants[0].size_label === "N/A"
        ? "No size"
        : variants[0].size_label
      : "Multiple sizes";

  const conditionBadge =
    product.condition === "new" ? (
      <span className="bg-green-600/20 text-green-200 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20">
        NEW
      </span>
    ) : product.condition === "used" ? (
      <span className="bg-amber-500/20 text-amber-200 text-[10px] px-2 py-0.5 rounded-full border border-amber-400/20">
        USED
      </span>
    ) : null;

  return (
    <Link
      href={`/store/${product.id}`}
      className="group block h-full"
      data-testid="product-card"
      data-product-id={product.id}
    >
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden hover:border-zinc-600/70 transition flex h-full flex-col">
        <div className="aspect-square relative bg-zinc-800">
          {primaryImage && (
            <Image
              src={primaryImage.url}
              alt={product.title_display ?? product.name}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}

          {conditionBadge && (
            <div className="absolute top-2 right-2 z-10">{conditionBadge}</div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
            <h3 className="text-white font-bold text-sm truncate flex-1">
              {product.title_display ?? `${product.brand} ${product.name}`.trim()}
            </h3>
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-gray-400 text-xs">Size: {sizeDisplay}</span>
            <span className="text-white font-bold text-sm">{priceDisplay}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
