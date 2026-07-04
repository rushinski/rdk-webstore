"use client";

import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

import { InventoryProductActionMenu } from "@/modules/catalog/presentation/admin/inventory/InventoryProductActionMenu";
import { InventoryProductLiveBadge } from "@/modules/catalog/presentation/admin/inventory/InventoryProductLiveBadge";
import { InventoryProductVariantPanels } from "@/modules/catalog/presentation/admin/inventory/InventoryProductVariantPanels";
import type { InventoryProductListProps } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListTypes";
import { buildInventoryProductCardModel } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListView";
import type { ProductWithDetails } from "@/types/domain/product";

type InventoryProductTableRowProps = Pick<
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
  | "selectedIds"
> & {
  product: ProductWithDetails;
};

export function InventoryProductTableRow({
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
  product,
  selectedIds,
}: InventoryProductTableRowProps) {
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
    <Fragment>
      <tr
        className="cursor-pointer border-b border-brand-border transition hover:bg-brand-page"
        data-testid="inventory-row"
        data-product-id={product.id}
        onClick={() => onToggleVariants(product.id)}
      >
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
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
              <img src={primaryImageUrl} alt={rawTitle} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-brand-muted">No image</span>
            )}
          </div>
        </td>

        <td className="min-w-0 px-4 py-3">
          <div className="truncate font-semibold text-brand-text">{rawTitle}</div>
        </td>

        <td className="truncate px-2 py-3 text-left capitalize text-brand-muted">
          {product.category}
        </td>

        <td className="whitespace-nowrap px-2 py-3 text-center text-brand-text">
          {totalStock}
        </td>

        <td className="px-2 py-3 text-left">
          <InventoryProductLiveBadge liveState={liveState} />
        </td>

        <td className="px-2 py-3 text-left" onClick={(event) => event.stopPropagation()}>
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

        <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-start">
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
        </td>
      </tr>
      <InventoryProductVariantPanels
        mode="desktop"
        onOpenDetails={onOpenDetails}
        product={product}
        variantsOpen={variantsOpen}
      />
    </Fragment>
  );
}
