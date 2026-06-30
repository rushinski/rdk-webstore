"use client";

import { useState } from "react";
import Image from "next/image";

import type { ProductWithDetails } from "@/types/domain/product";

export function ProductImageGallery({ product }: { product: ProductWithDetails }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = product.images[selectedImageIndex] ?? product.images[0];

  return (
    <div>
      <div className="relative aspect-square w-full bg-brand-page">
        <Image
          src={selectedImage?.url || "/placeholder.png"}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
          priority
        />
      </div>
      {product.images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {product.images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedImageIndex(index)}
              className={`relative h-14 w-14 flex-shrink-0 border ${
                selectedImageIndex === index ? "border-brand-text" : "border-brand-border"
              } bg-brand-page`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={`${product.name} ${index + 1}`}
                fill
                sizes="56px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
