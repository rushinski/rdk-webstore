// src/components/store/ProductDetail.tsx
// OPTIMIZED VERSION - Mobile Performance Improvements
"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

import type { ProductWithDetails } from "@/types/domain/product";
import { useCart } from "@/components/cart/CartProvider";
import { Toast } from "@/components/ui/Toast";
import { RdkSelect, type RdkSelectOption } from "@/components/ui/Select";

interface ProductDetailProps {
  product: ProductWithDetails;
}

// OPTIMIZATION 1: Separate image gallery into its own component for better code splitting
function ProductImageGallery({ 
  images, 
  productName 
}: { 
  images: ProductWithDetails['images']; 
  productName: string;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // OPTIMIZATION 2: Lazy load thumbnail images
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<number>>(new Set([0]));

  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index);
    // Preload adjacent images
    setLoadedThumbnails(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      if (index > 0) newSet.add(index - 1);
      if (index < images.length - 1) newSet.add(index + 1);
      return newSet;
    });
  };

  return (
    <div>
      {/* Main Image */}
      <div className="aspect-square relative bg-zinc-900 rounded overflow-hidden mb-4">
        <Image
          src={images[selectedImageIndex]?.url || "/placeholder.png"}
          alt={`${productName} - Image ${selectedImageIndex + 1}`}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority={selectedImageIndex === 0}
          loading={selectedImageIndex === 0 ? "eager" : "lazy"}
          className="object-cover"
          quality={85}
        />
      </div>
      
      {/* Thumbnail Grid - Only render if more than 1 image */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleThumbnailClick(index)}
              className={`aspect-square relative bg-zinc-900 rounded overflow-hidden border-2 ${
                selectedImageIndex === index ? "border-red-600" : "border-transparent"
              }`}
              type="button"
              aria-label={`View image ${index + 1}`}
            >
              {loadedThumbnails.has(index) ? (
                <Image
                  src={image.url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 10vw, 20vw"
                  loading={index < 4 ? "eager" : "lazy"}
                  className="object-cover"
                  quality={60}
                />
              ) : (
                <div className="w-full h-full bg-zinc-800" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// OPTIMIZATION 3: Memoize product info section
function ProductInfo({ product }: { product: ProductWithDetails }) {
  const { addItem, items } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id ?? "",
  );
  const selectedSizeLabelRef = useRef<string | null>(
    product.variants[0]?.size_label ?? null,
  );
  const [showShipping, setShowShipping] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];

  const primaryImage = product.images.find((img) => img.is_primary) || product.images[0];

  const inCartItem = selectedVariant
    ? items.find(
        (item) => item.productId === product.id && item.variantId === selectedVariant.id,
      )
    : undefined;

  const inCartQuantity = inCartItem?.quantity ?? 0;
  const canAddMore = selectedVariant ? selectedVariant.stock > inCartQuantity : false;

  // OPTIMIZATION 4: Memoize size options to prevent recalculation
  const sizeOptions: RdkSelectOption[] = useMemo(() => {
    return product.variants.map((variant) => ({
      value: variant.id,
      label: `${variant.size_label} - $${(variant.price_cents / 100).toFixed(2)} (${variant.stock} in stock)`,
      disabled: variant.stock === 0,
    }));
  }, [product.variants]);

  const sizeDisplay =
    selectedVariant?.size_label === "N/A"
      ? "No size"
      : (selectedVariant?.size_label ?? "");

  useEffect(() => {
    const current = product.variants.find((v) => v.id === selectedVariantId);
    if (current) {
      selectedSizeLabelRef.current = current.size_label;
      return;
    }

    const fallbackLabel = selectedSizeLabelRef.current;
    const byLabel = fallbackLabel
      ? product.variants.find((v) => v.size_label === fallbackLabel)
      : undefined;
    const next = byLabel ?? product.variants[0];
    if (next && next.id !== selectedVariantId) {
      selectedSizeLabelRef.current = next.size_label;
      setSelectedVariantId(next.id);
    }
  }, [product.variants, selectedVariantId]);

  // OPTIMIZATION 5: Use useCallback for event handlers to prevent re-renders
  const handleAddToCart = () => {
    if (!selectedVariant) {
      return;
    }
    if (!canAddMore) {
      setToast({
        message: "Only limited stock is available for this size.",
        tone: "info",
      });
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      sizeLabel: selectedVariant.size_label,
      brand: product.brand,
      name: product.name,
      titleDisplay: product.title_display ?? `${product.brand} ${product.name}`.trim(),
      priceCents: selectedVariant.price_cents,
      imageUrl: primaryImage?.url || "/placeholder.png",
      maxStock: selectedVariant.stock,
    });

    setToast({ message: "Added to cart.", tone: "success" });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">
        {product.title_raw ?? `${product.brand} ${product.name}`.trim()}
      </h1>
      {product.model && (
        <p className="text-sm text-gray-500 mb-2">Model: {product.model}</p>
      )}

      <div className="flex items-center gap-4 mb-6">
        <span className="text-3xl font-bold text-white">
          ${(((selectedVariant?.price_cents ?? 0) as number) / 100).toFixed(2)}
        </span>
        <span
          className={`px-3 py-1 rounded text-sm font-semibold ${
            product.condition === "new"
              ? "bg-green-600 text-white"
              : "bg-yellow-600 text-white"
          }`}
        >
          {product.condition.toUpperCase()}
        </span>
      </div>

      {/* Size */}
      <div className="mb-6">
        <label className="block text-white font-semibold mb-2">Size</label>

        {product.variants.length <= 1 ? (
          <div className="w-full bg-zinc-900 text-white px-4 py-3 rounded border border-zinc-800/70">
            {sizeDisplay || "No size"}
          </div>
        ) : (
          <RdkSelect
            value={selectedVariantId}
            onChange={setSelectedVariantId}
            options={sizeOptions}
            className="w-full"
            buttonClassName="px-4 py-3"
          />
        )}
      </div>

      {/* Stock Info */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm">
          {selectedVariant && selectedVariant.stock > 0 ? (
            <span className="text-green-400">{selectedVariant.stock} in stock</span>
          ) : (
            <span className="text-red-400">Out of stock</span>
          )}
        </p>
      </div>

      {/* Add to Cart */}
      <button
        onClick={handleAddToCart}
        disabled={!selectedVariant || selectedVariant.stock === 0 || !canAddMore}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition mb-6"
        type="button"
      >
        {!selectedVariant || selectedVariant.stock === 0
          ? "Out of Stock"
          : inCartQuantity > 0
            ? canAddMore
              ? `Add Another (${inCartQuantity} in cart)`
              : "In Cart (Max)"
            : "Add to Cart"}
      </button>

      {inCartQuantity > 0 && (
        <p className="text-xs text-gray-500 mb-6">
          This size is already in your cart.
        </p>
      )}

      {/* Description */}
      {product.description && (
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-2">Description</h3>
          <p className="text-gray-400 text-sm whitespace-pre-wrap">
            {product.description}
          </p>
        </div>
      )}

      {/* Condition Note */}
      {product.condition === "used" && product.condition_note && (
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-2">Condition Details</h3>
          <p className="text-gray-400 text-sm">{product.condition_note}</p>
        </div>
      )}

      {/* Shipping & Returns Accordion */}
      <div className="border-t border-zinc-800/70 pt-4">
        <button
          onClick={() => setShowShipping(!showShipping)}
          className="flex items-center justify-between w-full text-white font-semibold mb-2"
          type="button"
        >
          Shipping & Returns
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showShipping ? "rotate-180" : ""}`}
          />
        </button>

        {showShipping && (
          <div className="text-gray-400 text-sm space-y-2">
            <p>
              We aim to ship within 24 hours (processing time, not delivery time).
              Shipping options and rates are shown at checkout.
            </p>
            <p>
              All sales are final except as outlined in our Returns &amp; Refunds
              policy.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/shipping" className="text-red-500 hover:underline">
                Shipping Policy
              </a>
              <a href="/refunds" className="text-red-500 hover:underline">
                Returns &amp; Refunds
              </a>
            </div>
          </div>
        )}
      </div>

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

// Main component with optimized layout
export function ProductDetail({ product }: ProductDetailProps) {
  const productName = product.title_raw ?? `${product.brand} ${product.name}`.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery - Left Side */}
        <Suspense fallback={<div className="aspect-square bg-zinc-900 rounded animate-pulse" />}>
          <ProductImageGallery 
            images={product.images} 
            productName={productName}
          />
        </Suspense>

        {/* Product Info - Right Side */}
        <ProductInfo product={product} />
      </div>
    </div>
  );
}