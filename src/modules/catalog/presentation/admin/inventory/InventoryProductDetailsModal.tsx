"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { InventoryProductImageGallery } from "@/modules/catalog/presentation/admin/inventory/InventoryProductImageGallery";
import { InventoryProductMetadataPanel } from "@/modules/catalog/presentation/admin/inventory/InventoryProductMetadataPanel";
import {
  formatInventoryDetailsDateTime,
  getInventoryDetailsImages,
  getInventoryProductDetailSummary,
} from "@/modules/catalog/presentation/admin/inventory/inventoryProductDetailsView";
import { ModalPortal } from "@/components/ui/ModalPortal";
import type { ProductWithDetails, ProductVariantRow } from "@/types/domain/product";

type InventoryProductDetailsModalProps = {
  open: boolean;
  product: ProductWithDetails | null;
  variant: ProductVariantRow | null;
  onClose: () => void;
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

  const images = useMemo(() => getInventoryDetailsImages(product), [product]);

  if (!product || !variant) {
    return null;
  }

  const activeImage = images[selectedImageIndex]?.url ?? "/images/rdk-logo.png";
  const title = product.name || "Item";
  const summaryItems = getInventoryProductDetailSummary(variant);

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
                {formatInventoryDetailsDateTime(product.created_at)}
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
            <InventoryProductImageGallery
              activeImage={activeImage}
              images={images}
              selectedImageIndex={selectedImageIndex}
              title={title}
              onSelectImage={setSelectedImageIndex}
            />
            <InventoryProductMetadataPanel
              product={product}
              summaryItems={summaryItems}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
