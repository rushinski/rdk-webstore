"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/buttonStyles";
import { useCart } from "@/components/cart/CartProvider";
import { RdkSelect, type RdkSelectOption } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import type { ProductWithDetails } from "@/types/domain/product";

export function ProductPurchasePanel({ product }: { product: ProductWithDetails }) {
  const { addItem, items } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id ?? "",
  );
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const selectedSizeLabelRef = useRef<string | null>(
    product.variants[0]?.size_label ?? null,
  );

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0];

  const sizeOptions: RdkSelectOption[] = useMemo(
    () =>
      product.variants.map((variant) => ({
        value: variant.id,
        label: `${variant.size_label} - $${(variant.sale_price_cents / 100).toFixed(2)}`,
        disabled: variant.stock === 0,
      })),
    [product.variants],
  );

  if (selectedVariant && selectedSizeLabelRef.current !== selectedVariant.size_label) {
    selectedSizeLabelRef.current = selectedVariant.size_label;
  }

  const inCartItem = selectedVariant
    ? items.find(
        (item) => item.productId === product.id && item.variantId === selectedVariant.id,
      )
    : undefined;
  const inCartQuantity = inCartItem?.quantity ?? 0;
  const canAddMore = selectedVariant ? selectedVariant.stock > inCartQuantity : false;
  const primaryImage =
    product.images.find((image) => image.is_primary) ?? product.images[0];
  const conditionLabel =
    product.condition === "used"
      ? "Pre-Owned"
      : product.condition === "new"
        ? "New"
        : product.condition;

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
      titleDisplay: product.name,
      priceCents: selectedVariant.sale_price_cents,
      imageUrl: primaryImage?.url || "/placeholder.png",
      maxStock: selectedVariant.stock,
    });

    setToast({ message: "Added to cart.", tone: "success" });
  };

  return (
    <div>
      <div className="text-xs uppercase tracking-[0.08em] text-brand-muted">
        {product.brand || "Brand"}
      </div>
      <h1 className="mt-1 text-xl font-black uppercase tracking-[0.08em] text-brand-text">
        {product.name}
      </h1>
      <div className="mt-3 text-2xl font-bold text-brand-text">
        ${(((selectedVariant?.sale_price_cents ?? 0) as number) / 100).toFixed(2)}
      </div>
      <div className="mt-1 text-sm text-brand-muted">{conditionLabel}</div>

      <div className="mt-6">
        <label className="mb-2 block text-sm font-bold uppercase text-brand-text">
          Size
        </label>
        {product.variants.length <= 1 ? (
          <div className="border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-text">
            {selectedVariant?.size_label || "No size"}
          </div>
        ) : (
          <RdkSelect
            value={selectedVariantId}
            onChange={setSelectedVariantId}
            options={sizeOptions}
            className="w-full"
            buttonClassName="h-12 border-brand-border bg-brand-surface px-4 text-left text-sm text-brand-text"
          />
        )}
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!selectedVariant || selectedVariant.stock === 0 || !canAddMore}
        className={`${buttonStyles.primary} mt-6 w-full py-4 disabled:cursor-not-allowed disabled:bg-neutral-400`}
      >
        ADD TO CART
      </button>

      {product.description ? (
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-brand-text">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-muted">
            {product.description}
          </p>
        </div>
      ) : null}

      <div className="mt-8 border-t border-brand-border pt-4 text-sm text-brand-muted">
        <p>
          We aim to ship within 24 hours. Shipping options and rates are shown at
          checkout.
        </p>
        <div className="mt-3 flex gap-4">
          <Link href="/shipping" className="text-brand-text hover:underline">
            Shipping Policy
          </Link>
          <Link href="/refunds" className="text-brand-text hover:underline">
            Returns &amp; Refunds
          </Link>
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
