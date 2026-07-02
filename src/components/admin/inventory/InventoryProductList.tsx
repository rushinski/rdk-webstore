"use client";

import { InventoryProductMobileCards } from "@/components/admin/inventory/InventoryProductMobileCards";
import { InventoryProductTable } from "@/components/admin/inventory/InventoryProductTable";
import type { InventoryProductListProps } from "@/components/admin/inventory/inventoryProductListTypes";

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
      <InventoryProductTable
        currentPageAllSelected={currentPageAllSelected}
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
        onToggleCurrentPage={onToggleCurrentPage}
        onToggleMenu={onToggleMenu}
        onToggleSelection={onToggleSelection}
        onToggleVariants={onToggleVariants}
        openMenuId={openMenuId}
        products={products}
        selectedIds={selectedIds}
      />

      <InventoryProductMobileCards
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
        products={products}
        selectedIds={selectedIds}
      />
    </>
  );
}
