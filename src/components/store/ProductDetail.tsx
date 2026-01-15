// src/components/store/ProductDetail.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { ProductWithDetails } from "@/types/domain/product";
import { useCart } from "@/components/cart/CartProvider";
import { Toast } from "@/components/ui/Toast";

interface ProductDetailProps {
  product: ProductWithDetails;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem, items } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showShipping, setShowShipping] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const primaryImage = product.images.find((img) => img.is_primary) || product.images[0];
  const inCartItem = selectedVariant
    ? items.find(
        (item) => item.productId === product.id && item.variantId === selectedVariant.id,
      )
    : undefined;
  const inCartQuantity = inCartItem?.quantity ?? 0;
  const canAddMore = selectedVariant ? selectedVariant.stock > inCartQuantity : false;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square relative bg-zinc-900 rounded overflow-hidden mb-4">
            <Image
              src={product.images[selectedImageIndex]?.url || "/placeholder.png"}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                className={`aspect-square relative bg-zinc-900 rounded overflow-hidden border-2 ${
                  selectedImageIndex === index ? "border-red-600" : "border-transparent"
                }`}
              >
                <Image
                  src={image.url}
                  alt={`${product.name} ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 10vw, 20vw"
                  loading="lazy"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {product.title_display ?? `${product.brand} ${product.name}`.trim()}
          </h1>
          {product.model && (
            <p className="text-sm text-gray-500 mb-2">Model: {product.model}</p>
          )}

          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-white">
              ${(selectedVariant.price_cents / 100).toFixed(2)}
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

          {/* Size Selection */}
          {product.variants.length > 1 && (
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">Size</label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full bg-zinc-900 text-white px-4 py-3 rounded border border-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.size_label} - ${(variant.price_cents / 100).toFixed(2)} (
                    {variant.stock} in stock)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stock Info */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm">
              {selectedVariant.stock > 0 ? (
                <span className="text-green-400">{selectedVariant.stock} in stock</span>
              ) : (
                <span className="text-red-400">Out of stock</span>
              )}
            </p>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={selectedVariant.stock === 0 || !canAddMore}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition mb-6"
          >
            {selectedVariant.stock === 0
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
        </div>
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
