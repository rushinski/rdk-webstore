"use client";

import { X, Package, Tag, Layers, Hash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ModalPortal } from "@/components/ui/ModalPortal";

// --- Types (Same as before) ---
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
  quantity?: number | null;
  line_total?: number | null;
  unit_cost?: number | null;
  unit_price?: number | null;
  product?: {
    images?: AdminOrderItemImage[] | null;
    title_display?: string | null;
    brand?: string | null;
    model?: string | null;
    name?: string | null;
    created_at?: string | null;
    category?: string | null;
    description?: string | null;
    sku?: string | null;
    cost_cents?: number | null;
    tags?: AdminOrderItemTagLink[] | null;
  } | null;
  variant?: {
    size_label?: string | null;
    price_cents?: number | null;
    cost_cents?: number | null;
  } | null;
};

type AdminOrderItemFinancials = {
  quantity: number;
  unitCost: number;
  unitPrice: number;
  unitProfit: number;
};

// --- Helpers ---
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
  (item.product?.title_display ??
    `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()) ||
  "Item";

export const getOrderItemFinancials = (
  item: AdminOrderItem,
): AdminOrderItemFinancials => {
  const quantity = Math.max(1, Number(item.quantity ?? 0));
  const fallbackUnitPrice =
    quantity > 0 ? Number(item.line_total ?? 0) / quantity : Number(item.line_total ?? 0);
  const unitPrice =
    item.unit_price !== null && item.unit_price !== undefined
      ? Number(item.unit_price)
      : item.variant?.price_cents !== null && item.variant?.price_cents !== undefined
        ? Number(item.variant.price_cents) / 100
        : fallbackUnitPrice;

  const unitCost =
    item.unit_cost !== null && item.unit_cost !== undefined
      ? Number(item.unit_cost)
      : item.variant?.cost_cents !== null && item.variant?.cost_cents !== undefined
        ? Number(item.variant.cost_cents) / 100
        : Number(item.product?.cost_cents ?? 0) / 100;
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

// --- Components ---

const DetailRow = ({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={`flex flex-col gap-0.5 ${className || ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
    <div className="text-sm font-medium text-zinc-200 truncate">{value}</div>
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
    default: "text-zinc-100",
    green: "text-emerald-400",
    red: "text-rose-400",
  };

  return (
    <div className="flex flex-col rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
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
};

export function AdminOrderItemDetailsModal({
  open,
  item,
  onClose,
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
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-4xl flex-col overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl rounded-lg max-h-[80vh]"
      >
        {/* --- Header (Fixed) --- */}
        <div className="flex-shrink-0 flex items-start justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-lg font-bold text-white">{productTitle}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-500">SKU:</span>
                {/* UPDATED: Removed border/bg box styles */}
                <span className="font-mono text-zinc-300">
                  {item.product?.sku?.trim() || "N/A"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-500">Created:</span>
                <span className="text-zinc-300">
                  {formatDateTime(item.product?.created_at)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* --- Content Scroll Area --- */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* --- Left Side: Gallery --- */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full overflow-hidden rounded border border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Product Main"
                  className="h-48 w-full object-contain p-2 md:h-[300px]"
                />
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-black transition-all ${
                        selectedImageIndex === idx
                          ? "border-white ring-1 ring-white"
                          : "border-zinc-800 opacity-60 hover:opacity-100"
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

            {/* --- Right Side: Details --- */}
            <div className="flex flex-col gap-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Bought" value={formatMoney(financials.unitCost)} />
                <StatCard label="Sold" value={formatMoney(financials.unitPrice)} />
                <StatCard label="Quantity" value={financials.quantity.toString()} />
                <StatCard
                  label="Profit"
                  value={`${profitPrefix}${formattedUnitProfit}`}
                  color={profitColor}
                />
              </div>

              {/* Attributes */}
              <div className="rounded border border-zinc-800 bg-zinc-900/20 p-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <DetailRow
                    label="Brand"
                    value={item.product?.brand || "-"}
                    icon={Package}
                  />
                  <DetailRow
                    label="Category"
                    value={item.product?.category || "-"}
                    icon={Layers}
                  />
                  <DetailRow label="Model" value={item.product?.model || "-"} />
                  <DetailRow
                    label="Size"
                    value={item.variant?.size_label || "N/A"}
                    icon={Hash}
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Tags
                  </div>
                  {tagLabels.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tagLabels.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-xs italic">No tags</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Description
                </h4>
                <div className="max-h-32 overflow-y-auto rounded border border-zinc-800 bg-zinc-900/20 p-3 text-xs leading-relaxed text-zinc-400">
                  {item.product?.description ? (
                    <p className="whitespace-pre-wrap">{item.product.description}</p>
                  ) : (
                    <p className="italic opacity-50">No description.</p>
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
