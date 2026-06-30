"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Hash, Layers, Package, Tag, X } from "lucide-react";

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

type AdminOrderItemFinancials = {
  quantity: number;
  unitCost: number;
  unitPrice: number;
  unitProfit: number;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

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

const getTitle = (item: AdminOrderItem) =>
  item.product_name ?? item.product?.name ?? "Item";

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

const getTagLabels = (item: AdminOrderItem) =>
  Array.from(
    new Set(
      (item.product?.tags ?? [])
        .map((entry) => entry.tag?.label?.trim())
        .filter((label): label is string => Boolean(label)),
    ),
  );

const DetailRow = ({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={`flex flex-col gap-0.5 ${className ?? ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
    <div className="truncate text-sm font-medium text-brand-text">{value}</div>
  </div>
);

const StatCard = ({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "green" | "red";
}) => {
  const colorStyles = {
    default: "text-brand-text",
    green: "text-emerald-700",
    red: "text-red-700",
  };

  return (
    <div className="flex flex-col border border-brand-border bg-brand-page p-3">
      <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
        {label}
      </span>
      <span className={`text-base font-semibold ${colorStyles[color]}`}>{value}</span>
    </div>
  );
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
    const raw = (item?.product?.images ?? []).filter(
      (entry): entry is AdminOrderItemImage => Boolean(entry?.url),
    );
    if (!raw.length) {
      return [{ url: "/images/rdk-logo.png", is_primary: true, sort_order: 0 }];
    }
    return [...raw].sort((a, b) => {
      const aPrimary = a.is_primary ? 0 : 1;
      const bPrimary = b.is_primary ? 0 : 1;
      if (aPrimary !== bPrimary) {
        return aPrimary - bPrimary;
      }
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });
  }, [item]);

  if (!item) {
    return null;
  }

  const productTitle = getTitle(item);
  const financials = getOrderItemFinancials(item);
  const tagLabels = getTagLabels(item);
  const formattedUnitProfit = formatMoney(Math.abs(financials.unitProfit));
  const profitColor = financials.unitProfit >= 0 ? "green" : "red";
  const profitPrefix = financials.unitProfit >= 0 ? "+" : "-";
  const selectedImage = images[selectedImageIndex]?.url || "/images/rdk-logo.png";

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
                  {formatDateTime(item.product?.created_at)}
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
            <div className="flex flex-col gap-3">
              <div className="relative flex w-full items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
                <img
                  src={selectedImage}
                  alt="Product Main"
                  className="h-48 w-full object-contain p-2 md:h-[300px]"
                />
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative h-12 w-12 flex-shrink-0 overflow-hidden border transition-all ${
                        selectedImageIndex === idx
                          ? "border-brand-text bg-brand-page"
                          : "border-brand-border bg-brand-page opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.url || ""}
                        className="h-full w-full object-cover"
                        alt="thumb"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Bought" value={formatMoney(financials.unitCost)} />
                <StatCard label="Sold" value={formatMoney(financials.unitPrice)} />
                <StatCard label="Quantity" value={financials.quantity.toString()} />
                {showProfit && (
                  <StatCard
                    label="Profit"
                    value={`${profitPrefix}${formattedUnitProfit}`}
                    color={profitColor}
                  />
                )}
              </div>

              <div className="border border-brand-border bg-brand-page p-4">
                <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                  <DetailRow
                    label="Brand"
                    value={item.brand || item.product?.brand || "-"}
                    icon={Package}
                  />
                  <DetailRow
                    label="Category"
                    value={item.category || item.product?.category || "-"}
                    icon={Layers}
                  />
                  <DetailRow
                    label="Model"
                    value={item.model || item.product?.model || "-"}
                  />
                  <DetailRow
                    label="Size"
                    value={item.size_label || item.variant?.size_label || "N/A"}
                    icon={Hash}
                  />
                </div>

                <div className="mt-4 border-t border-brand-border pt-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                    <Tag className="h-3 w-3" /> Tags
                  </div>
                  {tagLabels.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tagLabels.map((tag) => (
                        <span
                          key={tag}
                          className="border border-brand-border bg-brand-surface px-1.5 py-0.5 text-[10px] text-brand-text"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs italic text-brand-muted">No tags</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                  Description
                </h4>
                <div className="max-h-32 overflow-y-auto border border-brand-border bg-brand-page p-3 text-xs leading-relaxed text-brand-muted">
                  {item.product?.description ? (
                    <p className="whitespace-pre-wrap">{item.product.description}</p>
                  ) : (
                    <p className="italic opacity-70">No description.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
