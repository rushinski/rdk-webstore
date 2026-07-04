"use client";

import { ChevronDown } from "lucide-react";

import { InventoryProductActionMenu } from "@/modules/catalog/presentation/admin/inventory/InventoryProductActionMenu";
import { InventoryProductLiveBadge } from "@/modules/catalog/presentation/admin/inventory/InventoryProductLiveBadge";
import { InventoryProductVariantPanels } from "@/modules/catalog/presentation/admin/inventory/InventoryProductVariantPanels";
import type { InventoryProductListProps } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListTypes";
import { buildInventoryProductCardModel } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListView";

type InventoryProductMobileCardsProps = Pick<
  InventoryProductListProps,
  | "expandedVariants"
  | "getPrimaryImageUrl"
  | "getProductLiveState"
  | "getProductRawTitle"
  | "getProductTotalStock"
  | "onDuplicateProduct"
  | "onOpenDetails"
  | "onRequestArchive"
  | "onRequestDelete"
  | "onRestoreProduct"
  | "onToggleMenu"
  | "onToggleSelection"
  | "onToggleVariants"
  | "openMenuId"
  | "products"
  | "selectedIds"
>;

export function InventoryProductMobileCards({
  expandedVariants,
  getPrimaryImageUrl,
  getProductLiveState,
  getProductRawTitle,
  getProductTotalStock,
  onDuplicateProduct,
  onOpenDetails,
  onRequestArchive,
  onRequestDelete,
  onRestoreProduct,
  onToggleMenu,
  onToggleSelection,
  onToggleVariants,
  openMenuId,
  products,
  selectedIds,
}: InventoryProductMobileCardsProps) {
  return (
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
                <InventoryProductLiveBadge liveState={liveState} />
              </div>

              <div className="flex flex-col items-end gap-2">
                <input
                  type="checkbox"
                  className="rdk-checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => onToggleSelection(product.id)}
                />

                <InventoryProductActionMenu
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

            <InventoryProductVariantPanels
              mode="mobile"
              onOpenDetails={onOpenDetails}
              product={product}
              variantsOpen={variantsOpen}
            />
          </div>
        );
      })}
    </div>
  );
}
