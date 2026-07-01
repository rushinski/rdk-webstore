"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Archive, ChevronDown, MoreVertical, RotateCcw } from "lucide-react";

import {
  buildInventoryProductCardModel,
  formatInventoryVariantMoney,
} from "@/components/admin/inventory/inventoryProductListView";
import type { ProductWithDetails, ProductVariantRow } from "@/types/domain/product";

type InventoryLiveState = {
  isLive: boolean;
  label: string;
  detail: string | null;
  detailTooltip: string | null;
};

export type InventoryProductListProps = {
  products: ProductWithDetails[];
  expandedVariants: Record<string, boolean>;
  selectedIds: string[];
  openMenuId: string | null;
  currentPageAllSelected: boolean;
  onToggleCurrentPage: (checked: boolean) => void;
  onToggleSelection: (productId: string) => void;
  onToggleVariants: (productId: string) => void;
  onToggleMenu: (productId: string) => void;
  onRestoreProduct: (productId: string) => void;
  onDuplicateProduct: (productId: string) => void;
  onRequestArchive: (product: ProductWithDetails) => void;
  onRequestDelete: (product: ProductWithDetails) => void;
  onOpenDetails: (product: ProductWithDetails, variant: ProductVariantRow) => void;
  getProductRawTitle: (product: ProductWithDetails) => string;
  getPrimaryImageUrl: (product: ProductWithDetails) => string | null;
  getProductTotalStock: (product: ProductWithDetails) => number;
  getProductLiveState: (product: ProductWithDetails) => InventoryLiveState;
};

type InventoryActionMenuProps = {
  product: ProductWithDetails;
  isOpen: boolean;
  onToggleMenu: (productId: string) => void;
  onRestoreProduct: (productId: string) => void;
  onDuplicateProduct: (productId: string) => void;
  onRequestArchive: (product: ProductWithDetails) => void;
  onRequestDelete: (product: ProductWithDetails) => void;
};

function InventoryLiveBadge({ liveState }: { liveState: InventoryLiveState }) {
  return (
    <div className="flex w-full flex-col items-start gap-1 text-left">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
          liveState.isLive
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {liveState.label}
      </span>
      {liveState.detail && (
        <span
          className="whitespace-nowrap text-left text-[11px] leading-none text-brand-muted"
          title={liveState.detailTooltip ?? undefined}
        >
          {liveState.detail}
        </span>
      )}
    </div>
  );
}

function InventoryActionMenu({
  product,
  isOpen,
  onToggleMenu,
  onRestoreProduct,
  onDuplicateProduct,
  onRequestArchive,
  onRequestDelete,
}: InventoryActionMenuProps) {
  return (
    <div className="relative" data-menu-id={product.id}>
      <button
        type="button"
        onClick={() => onToggleMenu(product.id)}
        className="cursor-pointer p-1.5 text-brand-muted transition hover:bg-brand-page hover:text-brand-text"
        aria-label="Open actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden border border-brand-border bg-brand-surface shadow-xl">
          <Link
            href={`/admin/inventory/${product.id}/edit`}
            onClick={() => onToggleMenu(product.id)}
            className="block px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page"
          >
            {product.archived_at ? "View" : "Edit"}
          </Link>
          {product.archived_at ? (
            <button
              type="button"
              onClick={() => onRestoreProduct(product.id)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-brand-page"
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onDuplicateProduct(product.id)}
                className="w-full cursor-pointer px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-page"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => onRequestArchive(product)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-brand-page"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <div className="h-px bg-brand-border" />
              <button
                type="button"
                onClick={() => onRequestDelete(product)}
                className="w-full cursor-pointer px-3 py-2 text-left text-sm text-red-700 transition hover:bg-brand-page"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function InventoryProductList({
  products,
  expandedVariants,
  selectedIds,
  openMenuId,
  currentPageAllSelected,
  onToggleCurrentPage,
  onToggleSelection,
  onToggleVariants,
  onToggleMenu,
  onRestoreProduct,
  onDuplicateProduct,
  onRequestArchive,
  onRequestDelete,
  onOpenDetails,
  getProductRawTitle,
  getPrimaryImageUrl,
  getProductTotalStock,
  getProductLiveState,
}: InventoryProductListProps) {
  return (
    <>
      <div className="hidden md:block">
        <div className="relative overflow-visible border border-brand-border bg-brand-surface">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-12" />
              <col className="w-20" />
              <col />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-44" />
              <col className="w-32" />
              <col className="w-20" />
            </colgroup>

            <thead>
              <tr className="border-b border-brand-border bg-brand-page">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rdk-checkbox"
                    onChange={(event) => onToggleCurrentPage(event.target.checked)}
                    checked={currentPageAllSelected}
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-muted">
                  Image
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-muted">
                  Product
                </th>
                <th className="px-2 py-3 text-left font-semibold text-brand-muted">
                  Category
                </th>
                <th className="px-2 py-3 text-center font-semibold text-brand-muted">
                  Stock
                </th>
                <th className="px-2 py-3 text-left font-semibold text-brand-muted">
                  Live Status
                </th>
                <th className="px-2 py-3 text-left font-semibold text-brand-muted">
                  Variants
                </th>
                <th className="px-2 py-3 text-left font-semibold text-brand-muted">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const { liveState, primaryImageUrl, rawTitle, totalStock, variantsOpen } =
                  buildInventoryProductCardModel({
                    expandedVariants,
                    getPrimaryImageUrl,
                    getProductLiveState,
                    getProductRawTitle,
                    getProductTotalStock,
                    product,
                  });

                return (
                  <Fragment key={product.id}>
                    <tr
                      className="cursor-pointer border-b border-brand-border transition hover:bg-brand-page"
                      data-testid="inventory-row"
                      data-product-id={product.id}
                      onClick={() => onToggleVariants(product.id)}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rdk-checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => onToggleSelection(product.id)}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
                          {primaryImageUrl ? (
                            <img
                              src={primaryImageUrl}
                              alt={rawTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-brand-muted">No image</span>
                          )}
                        </div>
                      </td>

                      <td className="min-w-0 px-4 py-3">
                        <div className="truncate font-semibold text-brand-text">
                          {rawTitle}
                        </div>
                      </td>

                      <td className="truncate px-2 py-3 text-left capitalize text-brand-muted">
                        {product.category}
                      </td>

                      <td className="whitespace-nowrap px-2 py-3 text-center text-brand-text">
                        {totalStock}
                      </td>

                      <td className="px-2 py-3 text-left">
                        <InventoryLiveBadge liveState={liveState} />
                      </td>

                      <td
                        className="px-2 py-3 text-left"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleVariants(product.id)}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-brand-text transition hover:text-black"
                        >
                          {variantsOpen ? "Hide variants" : "View variants"}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${variantsOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </td>

                      <td
                        className="px-2 py-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-start">
                          <InventoryActionMenu
                            product={product}
                            isOpen={openMenuId === product.id}
                            onToggleMenu={onToggleMenu}
                            onRestoreProduct={onRestoreProduct}
                            onDuplicateProduct={onDuplicateProduct}
                            onRequestArchive={onRequestArchive}
                            onRequestDelete={onRequestDelete}
                          />
                        </div>
                      </td>
                    </tr>

                    {variantsOpen && (
                      <tr className="border-b border-brand-border bg-brand-page">
                        <td colSpan={8} className="p-0">
                          <div className="py-1">
                            <div className="flex flex-col">
                              {product.variants.map((variant) => (
                                <div
                                  key={variant.id}
                                  onClick={() => onOpenDetails(product, variant)}
                                  className="group flex cursor-pointer items-center justify-start gap-8 px-6 py-4 transition-colors hover:bg-brand-surface"
                                >
                                  <div className="w-36 flex-shrink-0">
                                    <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                                      SKU
                                    </div>
                                    <div className="text-sm font-mono text-brand-text">
                                      {variant.sku || "N/A"}
                                    </div>
                                  </div>
                                  <div className="w-28 flex-shrink-0">
                                    <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                                      Size
                                    </div>
                                    <div className="text-sm font-medium text-brand-text">
                                      {variant.size_label}
                                    </div>
                                  </div>
                                  <div className="w-32 flex-shrink-0">
                                    <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                                      Unit Cost
                                    </div>
                                    <div className="text-sm font-medium text-brand-text">
                                      {formatInventoryVariantMoney(
                                        variant.unit_cost_cents,
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-32 flex-shrink-0">
                                    <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                                      Sale Price
                                    </div>
                                    <div className="text-sm font-bold text-brand-text">
                                      {formatInventoryVariantMoney(
                                        variant.sale_price_cents,
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-24 flex-shrink-0">
                                    <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                                      Stock
                                    </div>
                                    <div className="text-sm font-medium text-brand-text">
                                      {variant.stock ?? 0}
                                    </div>
                                  </div>
                                  <div className="w-20 flex-shrink-0">
                                    <span className="text-xs font-medium text-brand-text transition-colors group-hover:text-black">
                                      Details
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {products.map((product) => {
          const {
            liveState,
            primaryImageUrl,
            rawTitle,
            totalStock,
            variantCount,
            variantsOpen,
          } = buildInventoryProductCardModel({
            expandedVariants,
            getPrimaryImageUrl,
            getProductLiveState,
            getProductRawTitle,
            getProductTotalStock,
            product,
          });

          return (
            <div
              key={product.id}
              className="border border-brand-border bg-brand-surface p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
                  {primaryImageUrl ? (
                    <img
                      src={primaryImageUrl}
                      alt={rawTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-brand-muted">No image</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="truncate font-semibold leading-tight text-brand-text">
                    {rawTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                    <span className="capitalize">{product.category}</span>
                    <span className="text-brand-muted">-</span>
                    <span>Stock: {totalStock}</span>
                  </div>
                  <InventoryLiveBadge liveState={liveState} />
                </div>

                <div className="flex flex-col items-end gap-2">
                  <input
                    type="checkbox"
                    className="rdk-checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => onToggleSelection(product.id)}
                  />

                  <InventoryActionMenu
                    product={product}
                    isOpen={openMenuId === product.id}
                    onToggleMenu={onToggleMenu}
                    onRestoreProduct={onRestoreProduct}
                    onDuplicateProduct={onDuplicateProduct}
                    onRequestArchive={onRequestArchive}
                    onRequestDelete={onRequestDelete}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-brand-border pt-3">
                <button
                  type="button"
                  onClick={() => onToggleVariants(product.id)}
                  className="inline-flex items-center gap-1 text-sm text-brand-text transition hover:text-black"
                >
                  {variantsOpen ? "Hide variants" : "View variants"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${variantsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <span className="text-[11px] text-brand-muted">
                  {variantCount} variants
                </span>
              </div>

              {variantsOpen && (
                <div className="mt-3 space-y-2 border-t border-brand-border pt-3">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      onClick={() => onOpenDetails(product, variant)}
                      className="cursor-pointer border border-brand-border bg-brand-page p-3 transition-colors hover:bg-brand-surface"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-text">
                        <span>
                          <span className="text-brand-muted">SKU:</span>{" "}
                          <span className="font-mono">{variant.sku || "N/A"}</span>
                        </span>
                        <span>
                          <span className="text-brand-muted">Size:</span>{" "}
                          {variant.size_label}
                        </span>
                        <span>
                          <span className="text-brand-muted">Unit Cost:</span>{" "}
                          {formatInventoryVariantMoney(variant.unit_cost_cents)}
                        </span>
                        <span>
                          <span className="text-brand-muted">Sale Price:</span>{" "}
                          {formatInventoryVariantMoney(variant.sale_price_cents)}
                        </span>
                        <span>
                          <span className="text-brand-muted">Stock:</span>{" "}
                          {variant.stock ?? 0}
                        </span>
                        <span className="text-brand-text transition hover:text-black">
                          View details
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
