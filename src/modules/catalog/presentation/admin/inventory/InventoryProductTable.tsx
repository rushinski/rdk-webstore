"use client";

import { InventoryProductTableRow } from "@/modules/catalog/presentation/admin/inventory/InventoryProductTableRow";
import type { InventoryProductListProps } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListTypes";

type InventoryProductTableProps = Pick<
  InventoryProductListProps,
  | "currentPageAllSelected"
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
  | "onToggleCurrentPage"
  | "onToggleMenu"
  | "onToggleSelection"
  | "onToggleVariants"
  | "openMenuId"
  | "products"
  | "selectedIds"
>;

export function InventoryProductTable({
  currentPageAllSelected,
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
  onToggleCurrentPage,
  onToggleMenu,
  onToggleSelection,
  onToggleVariants,
  openMenuId,
  products,
  selectedIds,
}: InventoryProductTableProps) {
  return (
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
            {products.map((product) => (
              <InventoryProductTableRow
                key={product.id}
                product={product}
                expandedVariants={expandedVariants}
                getPrimaryImageUrl={getPrimaryImageUrl}
                getProductLiveState={getProductLiveState}
                getProductRawTitle={getProductRawTitle}
                getProductTotalStock={getProductTotalStock}
                onDuplicateProduct={onDuplicateProduct}
                onOpenDetails={onOpenDetails}
                onRequestArchive={onRequestArchive}
                onRequestDelete={onRequestDelete}
                onRestoreProduct={onRestoreProduct}
                onToggleMenu={onToggleMenu}
                onToggleSelection={onToggleSelection}
                onToggleVariants={onToggleVariants}
                openMenuId={openMenuId}
                selectedIds={selectedIds}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
