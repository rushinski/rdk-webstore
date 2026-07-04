"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import { OrderItemImageGallery } from "@/modules/orders/presentation/admin/order-item-details/OrderItemImageGallery";
import { OrderItemMetadataPanel } from "@/modules/orders/presentation/admin/order-item-details/OrderItemMetadataPanel";
import { getOrderItemFinancials } from "@/modules/orders/presentation/admin/order-item-details/orderItemFinancials";
import { getOrderItemImages } from "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsImages";
import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsTypes";
import {
  formatOrderItemDateTime,
  getOrderItemTagLabels,
  getOrderItemTitle,
} from "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsView";
import { useOrderItemDetailsModalState } from "@/modules/orders/presentation/admin/order-item-details/useOrderItemDetailsModalState";
import { ModalPortal } from "@/components/ui/ModalPortal";

type AdminOrderItemDetailsModalProps = {
  open: boolean;
  item: AdminOrderItem | null;
  onClose: () => void;
  showProfit?: boolean;
};

export function AdminOrderItemDetailsModal({
  open,
  item,
  onClose,
  showProfit = true,
}: AdminOrderItemDetailsModalProps) {
  const { selectedImageIndex, setSelectedImageIndex } =
    useOrderItemDetailsModalState({
      open,
      onClose,
    });

  const images = useMemo(() => {
    return getOrderItemImages(item?.product?.images);
  }, [item]);

  if (!item) {
    return null;
  }

  const productTitle = getOrderItemTitle(item);
  const financials = getOrderItemFinancials(item);
  getOrderItemTagLabels(item);

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[10000]">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden border border-brand-border bg-brand-surface shadow-2xl"
      >
        <div className="flex flex-shrink-0 items-start justify-between border-b border-brand-border bg-brand-surface px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
              {productTitle}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-brand-muted">SKU:</span>
                <span className="font-mono text-brand-text">
                  {item.variant_sku?.trim() || item.variant?.sku?.trim() || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-brand-muted">Created:</span>
                <span className="text-brand-text">
                  {formatOrderItemDateTime(item.product?.created_at)}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 text-brand-muted transition-colors hover:bg-brand-page hover:text-brand-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <OrderItemImageGallery
              images={images}
              productTitle={productTitle}
              selectedImageIndex={selectedImageIndex}
              setSelectedImageIndex={setSelectedImageIndex}
            />

            <OrderItemMetadataPanel
              financials={financials}
              item={item}
              showProfit={showProfit}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
