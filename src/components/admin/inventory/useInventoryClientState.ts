"use client";

import { useRef, useState } from "react";

import type {
  InventoryArchiveRequestState,
  InventoryDeleteRequestState,
  InventoryDetailsSelection,
  InventoryRestoreRequestState,
  InventoryToastState,
} from "@/components/admin/inventory/inventoryClientContracts";
import type {
  InventoryFilters,
  StockStatus,
} from "@/components/admin/inventory/inventoryClientData";
import type { Category, Condition, ProductWithDetails } from "@/types/domain/product";

type UseInventoryClientStateArgs = {
  initialFilters: InventoryFilters;
  initialInventoryUnitTotal: number;
  initialProducts: ProductWithDetails[];
  initialSkuTotal: number;
  initialTotal: number;
};

export function useInventoryClientState({
  initialFilters,
  initialInventoryUnitTotal,
  initialProducts,
  initialSkuTotal,
  initialTotal,
}: UseInventoryClientStateArgs) {
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

  return {
    categoryFilter,
    conditionFilter,
    detailsSelection,
    expandedVariants,
    filtersRef,
    inventoryUnitTotalCount,
    isLoading,
    openMenuId,
    page,
    pendingArchive,
    pendingDelete,
    pendingMassDelete,
    pendingRestore,
    products,
    refreshTimerRef,
    searchQuery,
    selectAllMatching,
    selectedIds,
    skuTotalCount,
    stockStatusFilter,
    toast,
    totalCount,
    setCategoryFilter,
    setConditionFilter,
    setDetailsSelection,
    setExpandedVariants,
    setInventoryUnitTotalCount,
    setIsLoading,
    setOpenMenuId,
    setPage,
    setPendingArchive,
    setPendingDelete,
    setPendingMassDelete,
    setPendingRestore,
    setProducts,
    setSearchQuery,
    setSelectAllMatching,
    setSelectedIds,
    setSkuTotalCount,
    setStockStatusFilter,
    setToast,
    setTotalCount,
  };
}
