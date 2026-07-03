"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import { OrderItemImageGallery } from "@/components/admin/orders/OrderItemImageGallery";
import { OrderItemMetadataPanel } from "@/components/admin/orders/OrderItemMetadataPanel";
import { getOrderItemImages } from "@/components/admin/orders/orderItemDetailsImages";
import {
  formatOrderItemDateTime,
  getOrderItemTagLabels,
  getOrderItemTitle,
} from "@/components/admin/orders/orderItemDetailsView";
import type { AdminOrderItemFinancials } from "@/components/admin/orders/orderItemTypes";
import { useOrderItemDetailsModalState } from "@/components/admin/orders/useOrderItemDetailsModalState";
import { ModalPortal } from "@/components/ui/ModalPortal";

export type AdminOrderItemImage = {
  url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type AdminOrderItemTagLink = {
  tag?: {
    label?: string | null;
    group_key?: string | null;
  } | null;
};

export type AdminOrderItem = {
  id: string;
  product_name?: string | null;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  condition?: string | null;
  variant_sku?: string | null;
  size_label?: string | null;
  quantity?: number | null;
  line_total?: number | null;
  refund_amount?: number | null;
  refunded_at?: string | null;
  unit_cost?: number | null;
  unit_price?: number | null;
  product?: {
    images?: AdminOrderItemImage[] | null;
    brand?: string | null;
    model?: string | null;
    name?: string | null;
    created_at?: string | null;
    category?: string | null;
    description?: string | null;
    tags?: AdminOrderItemTagLink[] | null;
  } | null;
  variant?: {
    sku?: string | null;
    size_label?: string | null;
    sale_price_cents?: number | null;
    unit_cost_cents?: number | null;
  } | null;
};

export const getOrderItemFinancials = (
  item: AdminOrderItem,
): AdminOrderItemFinancials => {
  const quantity = Math.max(1, Number(item.quantity ?? 0));
  const fallbackUnitPrice =
    quantity > 0 ? Number(item.line_total ?? 0) / quantity : Number(item.line_total ?? 0);
  const unitPrice =
    item.unit_price !== null && item.unit_price !== undefined
      ? Number(item.unit_price)
      : item.variant?.sale_price_cents !== null &&
          item.variant?.sale_price_cents !== undefined
        ? Number(item.variant.sale_price_cents) / 100
        : fallbackUnitPrice;

  const unitCost =
    item.unit_cost !== null && item.unit_cost !== undefined
      ? Number(item.unit_cost)
      : item.variant?.unit_cost_cents !== null &&
          item.variant?.unit_cost_cents !== undefined
        ? Number(item.variant.unit_cost_cents) / 100
        : 0;
  const unitProfit = unitPrice - unitCost;

  return { quantity, unitCost, unitPrice, unitProfit };
};

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
