// src/components/admin/inventory/InventoryClient.tsx
"use client";

import { useState, useRef } from "react";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import type {
  ProductWithDetails,
  ProductVariantRow,
  Category,
  Condition,
} from "@/types/domain/product";
import { InventoryClientContent } from "@/components/admin/inventory/InventoryClientContent";
import { InventoryDialogs } from "@/components/admin/inventory/InventoryDialogs";
import { InventoryPagination } from "@/components/admin/inventory/InventoryPagination";
import { InventoryToolbar } from "@/components/admin/inventory/InventoryToolbar";
import { InventoryClientHeaderActions } from "@/components/admin/inventory/InventoryClientHeaderActions";
import type {
  InventoryArchiveRequestState,
  InventoryDeleteRequestState,
  InventoryDetailsSelection,
  InventoryRestoreRequestState,
  InventoryToastState,
} from "@/components/admin/inventory/inventoryClientContracts";
import {
  getPrimaryImageUrl,
  getProductLiveState as deriveProductLiveState,
  getProductRawTitle,
  getProductTotalStock,
  type InventoryFilters,
  type StockStatus,
} from "@/components/admin/inventory/inventoryClientData";
import {
  getInventorySelectionState,
  toggleInventoryCurrentPageSelection,
  toggleInventorySelection,
} from "@/components/admin/inventory/inventoryClientSelection";
import { getInventoryHeaderDescription } from "@/components/admin/inventory/inventoryClientView";
import { getInventoryDerivedState } from "@/components/admin/inventory/inventoryClientDerivedState";
import {
  createInventoryDetailsSelection,
  toggleInventoryExpandedVariantState,
  toggleInventoryOpenMenuId,
} from "@/components/admin/inventory/inventoryClientUiState";
import { useInventoryClientData } from "@/components/admin/inventory/useInventoryClientData";
import { useInventoryClientEffects } from "@/components/admin/inventory/useInventoryClientEffects";
import { useInventoryClientMutations } from "@/components/admin/inventory/useInventoryClientMutations";

const PAGE_SIZE = 100;

interface InventoryClientProps {
  initialProducts: ProductWithDetails[];
  initialTotal: number;
  initialSkuTotal: number;
  initialInventoryUnitTotal: number;
  initialFilters: InventoryFilters;
}

export function InventoryClient({
  initialProducts,
  initialTotal,
  initialSkuTotal,
  initialInventoryUnitTotal,
  initialFilters,
}: InventoryClientProps) {
  const [products, setProducts] = useState<ProductWithDetails[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q || "");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">(
    initialFilters.category || "all",
  );
  const [conditionFilter, setConditionFilter] = useState<Condition | "all">(
    initialFilters.condition || "all",
  );
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatus>(
    initialFilters.stockStatus || "in_stock",
  );
  const [page, setPage] = useState(initialFilters.page || 1);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [skuTotalCount, setSkuTotalCount] = useState(initialSkuTotal);
  const [inventoryUnitTotalCount, setInventoryUnitTotalCount] = useState(
    initialInventoryUnitTotal,
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [detailsSelection, setDetailsSelection] =
    useState<InventoryDetailsSelection>(null);
  const [pendingDelete, setPendingDelete] = useState<InventoryDeleteRequestState>(null);
  const [pendingMassDelete, setPendingMassDelete] = useState(false);
  const [pendingArchive, setPendingArchive] =
    useState<InventoryArchiveRequestState>(null);
  const [pendingRestore, setPendingRestore] =
    useState<InventoryRestoreRequestState>(null);
  const [toast, setToast] = useState<InventoryToastState>(null);

  const filtersRef = useRef<InventoryFilters>({});
  const refreshTimerRef = useRef<number | null>(null);

  const { totalPages, showingStart, showingEnd, currentFilters } =
    getInventoryDerivedState({
      pageSize: PAGE_SIZE,
      totalCount,
      page,
      searchQuery,
      categoryFilter,
      conditionFilter,
      stockStatusFilter,
    });
  const { currentPageIds, currentPageAllSelected, selectedCount } =
    getInventorySelectionState({
      products,
      selectedIds,
      selectAllMatching,
      totalCount,
    });

  const { exportInventory, loadProducts } = useInventoryClientData({
    pageSize: PAGE_SIZE,
    filtersRef,
    setIsLoading,
    setProducts,
    setTotalCount,
    setSkuTotalCount,
    setInventoryUnitTotalCount,
    setToast,
  });

  useInventoryClientEffects({
    page,
    totalPages,
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    currentFilters,
    openMenuId,
    loadProducts,
    setPage,
    setSelectedIds,
    setSelectAllMatching,
    setExpandedVariants,
    setOpenMenuId,
    filtersRef,
    refreshTimerRef,
  });

  const getProductLiveState = (product: ProductWithDetails) =>
    deriveProductLiveState(product);

  const toggleVariants = (productId: string) => {
    setExpandedVariants((prev) => toggleInventoryExpandedVariantState(prev, productId));
  };

  const openDetailsModal = (product: ProductWithDetails, variant: ProductVariantRow) => {
    setDetailsSelection(createInventoryDetailsSelection(product, variant));
  };

  const toggleSelection = (id: string) => {
    setSelectAllMatching(false);
    setSelectedIds((prev) => toggleInventorySelection(prev, id));
  };

  const toggleSelectCurrentPage = (checked: boolean) => {
    setSelectAllMatching(false);
    setSelectedIds(toggleInventoryCurrentPageSelection(currentPageIds, checked));
  };

  const {
    clearSelection,
    confirmArchive,
    confirmDelete,
    confirmMassDelete,
    confirmRestore,
    handleDuplicate,
    handleMassArchive,
    handleMassDelete,
    handleMassRestore,
    handleSelectAllMatching,
    requestArchive,
    requestDelete,
    restoreProduct,
  } = useInventoryClientMutations({
    selectedIds,
    selectedCount,
    selectAllMatching,
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    currentFilters,
    pendingDelete,
    pendingArchive,
    pendingRestore,
    setSelectedIds,
    setSelectAllMatching,
    setOpenMenuId,
    setPendingDelete,
    setPendingMassDelete,
    setPendingArchive,
    setPendingRestore,
    setToast,
    loadProducts,
    getProductRawTitle,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        description={getInventoryHeaderDescription(
          skuTotalCount,
          totalCount,
          inventoryUnitTotalCount,
        )}
        actions={<InventoryClientHeaderActions onExport={() => void exportInventory()} />}
      />

      <InventoryToolbar
        totalCount={totalCount}
        showingStart={showingStart}
        showingEnd={showingEnd}
        stockStatusFilter={stockStatusFilter}
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        conditionFilter={conditionFilter}
        selectedCount={selectedCount}
        selectedIdsCount={selectedIds.length}
        selectAllMatching={selectAllMatching}
        currentPageAllSelected={currentPageAllSelected}
        onStockStatusFilterChange={setStockStatusFilter}
        onSearchQueryChange={setSearchQuery}
        onCategoryFilterChange={setCategoryFilter}
        onConditionFilterChange={setConditionFilter}
        onSelectAllMatching={handleSelectAllMatching}
        onClearSelection={clearSelection}
        onMassRestore={handleMassRestore}
        onMassArchive={handleMassArchive}
        onMassDelete={handleMassDelete}
      />

      <InventoryClientContent
        isLoading={isLoading}
        products={products}
        expandedVariants={expandedVariants}
        selectedIds={selectedIds}
        openMenuId={openMenuId}
        currentPageAllSelected={currentPageAllSelected}
        onToggleCurrentPage={toggleSelectCurrentPage}
        onToggleSelection={toggleSelection}
        onToggleVariants={toggleVariants}
        onToggleMenu={(productId) => {
          setOpenMenuId((prev) => toggleInventoryOpenMenuId(prev, productId));
        }}
        onRestoreProduct={(productId) => {
          void restoreProduct(productId);
        }}
        onDuplicateProduct={(productId) => {
          void handleDuplicate(productId);
        }}
        onRequestArchive={requestArchive}
        onRequestDelete={requestDelete}
        onOpenDetails={openDetailsModal}
        getProductRawTitle={getProductRawTitle}
        getPrimaryImageUrl={getPrimaryImageUrl}
        getProductTotalStock={getProductTotalStock}
        getProductLiveState={getProductLiveState}
      />

      {!isLoading && (
        <InventoryPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          showingStart={showingStart}
          showingEnd={showingEnd}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      )}

      <InventoryDialogs
        detailsSelection={detailsSelection}
        pendingDelete={pendingDelete}
        pendingMassDelete={pendingMassDelete}
        pendingArchive={pendingArchive}
        pendingRestore={pendingRestore}
        selectedCount={selectedCount}
        toast={toast}
        onCloseDetails={() => setDetailsSelection(null)}
        onConfirmDelete={() => {
          void confirmDelete();
        }}
        onCancelDelete={() => setPendingDelete(null)}
        onConfirmMassDelete={() => {
          void confirmMassDelete();
        }}
        onCancelMassDelete={() => setPendingMassDelete(false)}
        onConfirmArchive={() => {
          void confirmArchive();
        }}
        onCancelArchive={() => setPendingArchive(null)}
        onConfirmRestore={() => {
          void confirmRestore();
        }}
        onCancelRestore={() => setPendingRestore(null)}
        onCloseToast={() => setToast(null)}
      />
    </div>
  );
}
