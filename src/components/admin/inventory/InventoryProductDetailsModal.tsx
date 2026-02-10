"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import type { ProductWithDetails, ProductVariantRow } from "@/types/domain/product";

type InventoryProductDetailsModalProps = {
  open: boolean;
  product: ProductWithDetails | null;
  variant: ProductVariantRow | null;
  onClose: () => void;
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function InventoryProductDetailsModal({
  open,
  product,
  variant,
  onClose,
}: InventoryProductDetailsModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedImageIndex(0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const images = useMemo(() => {
    if (!product) {
      return [];
    }
    const available =
      product.images
        ?.filter((image) => Boolean(image.url))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) ?? [];

    if (available.length === 0) {
      return [{ url: "/images/rdk-logo.png", is_primary: true, sort_order: 0 }];
    }
    return available;
  }, [product]);

  if (!product || !variant) {
    return null;
  }

  const activeImage = images[selectedImageIndex]?.url ?? "/images/rdk-logo.png";
  const title =
    product.title_raw?.trim() || product.title_display || product.name || "Item";
  const listingPrice = formatMoney(variant.price_cents / 100);
  const costBasis =
    variant.cost_cents !== null && variant.cost_cents !== undefined
      ? formatMoney(variant.cost_cents / 100)
      : "-";
  const variantStock = variant.stock ?? 0;

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[10000]">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-950"
      >
        <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-lg font-bold text-white">{title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <div className="text-zinc-300">
                <span className="font-semibold text-zinc-500">SKU:</span>{" "}
                <span className="font-mono">{product.sku || "N/A"}</span>
              </div>
              <div className="text-zinc-300">
                <span className="font-semibold text-zinc-500">Created:</span>{" "}
                {formatDateTime(product.created_at)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="flex h-[260px] items-center justify-center overflow-hidden rounded border border-zinc-800 bg-zinc-900/50">
                <img
                  src={activeImage}
                  alt={title}
                  className="h-full w-full object-contain p-2"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((image, index) => (
                    <button
                      key={`${image.url ?? "img"}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded border ${
                        selectedImageIndex === index
                          ? "border-white ring-1 ring-white"
                          : "border-zinc-800 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={image.url ?? ""}
                        alt={`Image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Bought For
                  </div>
                  <div className="text-base font-semibold text-zinc-100">{costBasis}</div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Listing Price
                  </div>
                  <div className="text-base font-semibold text-zinc-100">
                    {listingPrice}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Size
                  </div>
                  <div className="text-base font-semibold text-zinc-100">
                    {variant.size_label || "N/A"}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Stock
                  </div>
                  <div className="text-base font-semibold text-zinc-100">
                    {variantStock}
                  </div>
                </div>
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-900/20 p-4">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Brand
                    </div>
                    <div className="text-sm font-medium text-zinc-200">
                      {product.brand || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Model
                    </div>
                    <div className="text-sm font-medium text-zinc-200">
                      {product.model || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Category
                    </div>
                    <div className="text-sm font-medium capitalize text-zinc-200">
                      {product.category || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Condition
                    </div>
                    <div className="text-sm font-medium capitalize text-zinc-200">
                      {product.condition || "-"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Description
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
                      {product.description?.trim() || "-"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Tags
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {product.tags.length > 0 ? (
                        product.tags.map((tag) => (
                          <span
                            key={`${tag.group_key}:${tag.label}`}
                            className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                          >
                            {tag.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-400">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
