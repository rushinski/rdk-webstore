"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

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
  const title = product.name || "Item";
  const salePrice = formatMoney(variant.sale_price_cents / 100);
  const unitCost = formatMoney(variant.unit_cost_cents / 100);
  const variantStock = variant.stock ?? 0;

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[10000]">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden border border-brand-border bg-brand-surface"
      >
        <div className="flex items-start justify-between border-b border-brand-border px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
              {title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <div className="text-brand-text">
                <span className="font-semibold text-brand-muted">SKU:</span>{" "}
                <span className="font-mono">{variant.sku || "N/A"}</span>
              </div>
              <div className="text-brand-text">
                <span className="font-semibold text-brand-muted">Created:</span>{" "}
                {formatDateTime(product.created_at)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-brand-muted transition-colors hover:bg-brand-page hover:text-brand-text"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="flex h-[260px] items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
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
                      className={`h-12 w-12 flex-shrink-0 overflow-hidden border ${
                        selectedImageIndex === index
                          ? "border-brand-text bg-brand-page"
                          : "border-brand-border opacity-70 hover:opacity-100"
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
                {[
                  ["Unit Cost", unitCost],
                  ["Sale Price", salePrice],
                  ["Size", variant.size_label || "N/A"],
                  ["Stock", String(variantStock)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border border-brand-border bg-brand-page p-3"
                  >
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      {label}
                    </div>
                    <div className="text-base font-semibold text-brand-text">{value}</div>
                  </div>
                ))}
              </div>

              <div className="border border-brand-border bg-brand-page p-4">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Brand
                    </div>
                    <div className="text-sm font-medium text-brand-text">
                      {product.brand || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Model
                    </div>
                    <div className="text-sm font-medium text-brand-text">
                      {product.model || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Category
                    </div>
                    <div className="text-sm font-medium capitalize text-brand-text">
                      {product.category || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Condition
                    </div>
                    <div className="text-sm font-medium capitalize text-brand-text">
                      {product.condition || "-"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Description
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-brand-muted">
                      {product.description?.trim() || "-"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Tags
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {product.tags.length > 0 ? (
                        product.tags.map((tag) => (
                          <span
                            key={`${tag.group_key}:${tag.label}`}
                            className="border border-brand-border bg-brand-surface px-1.5 py-0.5 text-[10px] text-brand-text"
                          >
                            {tag.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-brand-muted">-</span>
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
