"use client";

import { X, ArchiveRestore } from "lucide-react";
import { useEffect, useState } from "react";

type ComparableVariant = {
  sku: string;
  sizeLabel: string;
  salePriceCents: number;
  unitCostCents: number;
  stock: number;
  sortOrder: number;
};

type ComparableTag = {
  label: string;
  groupKey: string;
};

type ComparableProduct = {
  title: string;
  description: string | null;
  brand: string;
  model: string | null;
  category: string;
  condition: string;
  sizeType: string;
  isActive: boolean;
  isOutOfStock: boolean;
  imageUrls: string[];
  tags: ComparableTag[];
  variants: ComparableVariant[];
};

type ComparableDiff = {
  fields: string[];
  variantChanges: Array<{
    sku: string;
    fields: string[];
    changeType: "added" | "removed" | "changed";
  }>;
};

type SyncProductPreviewModalProps = {
  open: boolean;
  mode: "add" | "edit" | "archive" | "conflict";
  title: string;
  websiteProduct?: ComparableProduct | null;
  remoteProduct?: ComparableProduct | null;
  diff?: ComparableDiff | null;
  conflictCandidateCount?: number;
  isRestoreFromArchive?: boolean;
  onClose: () => void;
};

const formatMoney = (amountCents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((amountCents ?? 0) / 100);

function ProductPreviewPanel({
  label,
  product,
  diff,
}: {
  label: string;
  product: ComparableProduct | null | undefined;
  diff?: ComparableDiff | null;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product]);

  if (!product) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
        No product data available.
      </div>
    );
  }

  const activeImage =
    product.imageUrls[selectedImageIndex] ??
    product.imageUrls[0] ??
    "/images/rdk-logo.png";
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const representativeVariant = product.variants[0] ?? null;
  const changedVariantMap = new Map(
    (diff?.variantChanges ?? []).map((variantChange) => [variantChange.sku, variantChange]),
  );
  const hasFieldChange = (field: string) => Boolean(diff?.fields.includes(field));

  return (
    <div className="space-y-4 rounded border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {label}
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{product.title}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* Image section — fixed height so both panels stay aligned */}
        <div className="space-y-2">
          <div className="flex h-[220px] items-center justify-center overflow-hidden rounded border border-zinc-800 bg-zinc-900/60">
            <img src={activeImage} alt={product.title} className="h-full w-full object-contain p-2" />
          </div>
          {/* Always reserve thumbnail row height so panels match */}
          <div className="h-12 flex gap-2 overflow-x-auto">
            {product.imageUrls.length > 1
              ? product.imageUrls.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded border ${
                      selectedImageIndex === index
                        ? "border-white ring-1 ring-white"
                        : "border-zinc-800 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={imageUrl} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))
              : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Unit Cost
              </div>
              <div className={`text-base font-semibold ${representativeVariant && changedVariantMap.get(representativeVariant.sku)?.fields.includes("unitCostCents") ? "text-blue-300" : "text-zinc-100"}`}>
                {formatMoney(representativeVariant?.unitCostCents ?? 0)}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Sale Price
              </div>
              <div className={`text-base font-semibold ${representativeVariant && changedVariantMap.get(representativeVariant.sku)?.fields.includes("salePriceCents") ? "text-blue-300" : "text-zinc-100"}`}>
                {formatMoney(representativeVariant?.salePriceCents ?? 0)}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Status
              </div>
              <div className={`text-base font-semibold ${hasFieldChange("isActive") || hasFieldChange("isOutOfStock") ? "text-blue-300" : "text-zinc-100"}`}>
                {product.isActive ? (product.isOutOfStock ? "Out of stock" : "Active") : "Inactive"}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Stock
              </div>
              <div className={`text-base font-semibold ${hasFieldChange("variants") ? "text-blue-300" : "text-zinc-100"}`}>
                {totalStock}
              </div>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/20 p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {[
                ["Brand", product.brand, hasFieldChange("brand")],
                ["Model", product.model || "-", hasFieldChange("model")],
                ["Category", product.category || "-", hasFieldChange("category")],
                ["Condition", product.condition || "-", hasFieldChange("condition")],
              ].map(([labelText, value, changed]) => (
                <div key={String(labelText)}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {labelText}
                  </div>
                  <div className={`text-sm font-medium ${changed ? "text-blue-300" : "text-zinc-200"}`}>
                    {value}
                  </div>
                </div>
              ))}
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Description
                </div>
                <div className={`mt-1 whitespace-pre-wrap text-sm ${hasFieldChange("description") ? "text-blue-300" : "text-zinc-300"}`}>
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
                        key={`${tag.groupKey}:${tag.label}`}
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${
                          hasFieldChange("tags")
                            ? "border-blue-700 bg-blue-950/40 text-blue-200"
                            : "border-zinc-700 bg-zinc-800 text-zinc-300"
                        }`}
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

      <div className="rounded border border-zinc-800 bg-zinc-950/40">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-white">
          Variants
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Unit Cost</th>
                <th className="px-4 py-2">Sale Price</th>
                <th className="px-4 py-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => {
                const variantChange = changedVariantMap.get(variant.sku);
                const rowClass =
                  variantChange?.changeType === "added"
                    ? "bg-emerald-950/20"
                    : variantChange?.changeType === "removed"
                      ? "bg-amber-950/20"
                      : variantChange
                        ? "bg-blue-950/20"
                        : "";

                return (
                  <tr key={variant.sku} className={`border-t border-zinc-800 ${rowClass}`}>
                    <td className="px-4 py-2 font-mono text-zinc-200">{variant.sku}</td>
                    <td className={`px-4 py-2 ${variantChange?.fields.includes("sizeLabel") ? "text-blue-300" : "text-zinc-300"}`}>
                      {variant.sizeLabel}
                    </td>
                    <td className={`px-4 py-2 ${variantChange?.fields.includes("unitCostCents") ? "text-blue-300" : "text-zinc-300"}`}>
                      {formatMoney(variant.unitCostCents)}
                    </td>
                    <td className={`px-4 py-2 ${variantChange?.fields.includes("salePriceCents") ? "text-blue-300" : "text-zinc-300"}`}>
                      {formatMoney(variant.salePriceCents)}
                    </td>
                    <td className={`px-4 py-2 ${variantChange?.fields.includes("stock") ? "text-blue-300" : "text-zinc-300"}`}>
                      {variant.stock}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SyncProductPreviewModal({
  open,
  mode,
  title,
  websiteProduct,
  remoteProduct,
  diff,
  conflictCandidateCount,
  isRestoreFromArchive,
  onClose,
}: SyncProductPreviewModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isSideBySide = mode === "edit";
  const subtitle = isRestoreFromArchive
    ? mode === "edit"
      ? "This archived website product will be restored and updated to match Lightspeed."
      : "This archived website product will be restored (no field changes detected)."
    : mode === "add"
      ? "This product will be added to website inventory."
      : mode === "edit"
        ? "These website fields will be updated to match Lightspeed."
        : mode === "archive"
          ? "This website-only product will be archived."
          : `This Lightspeed product has ${conflictCandidateCount ?? 0} website candidates and will be skipped.`;

  // Rendered as an inline fixed overlay (not a portal) so z-index comparison
  // is always within the same stacking context as the sync dialog.
  return (
    <div
      className="fixed inset-0 z-[10010]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop — click closes this panel only */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-hidden="true"
      />
      {/* Centered content */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-950"
        >
          <div className="flex flex-shrink-0 items-start justify-between border-b border-zinc-800 px-5 py-4">
            <div className="min-w-0 pr-4">
              <h2 className="truncate text-lg font-bold text-white">{title}</h2>
              <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
              {isRestoreFromArchive && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded border border-sky-800/60 bg-sky-950/40 px-2 py-1 text-xs font-medium text-sky-300">
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Restore from archive
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
              aria-label="Close sync details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isSideBySide && (
            <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/40 px-5 py-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">Website (left)</span> shows the current state.{" "}
              <span className="font-semibold text-zinc-200">Lightspeed (right)</span> shows what will be applied.
              Fields highlighted in <span className="text-blue-300 font-semibold">blue</span> will change.
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            {isSideBySide ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <ProductPreviewPanel label="Website (Current)" product={websiteProduct} diff={diff} />
                <ProductPreviewPanel label="Lightspeed (Incoming)" product={remoteProduct} diff={diff} />
              </div>
            ) : mode === "archive" ? (
              <ProductPreviewPanel label="Website (Current)" product={websiteProduct} diff={null} />
            ) : (
              <ProductPreviewPanel label="Lightspeed" product={remoteProduct} diff={null} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
