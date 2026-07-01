// src/components/admin/inventory/InventoryClient.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { useRouter } from "next/navigation";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import type {
  ProductWithDetails,
  ProductVariantRow,
  Category,
  Condition,
} from "@/types/domain/product";
import { InventoryProductList } from "@/components/admin/inventory/InventoryProductList";
import { InventoryDialogs } from "@/components/admin/inventory/InventoryDialogs";
import { InventoryPagination } from "@/components/admin/inventory/InventoryPagination";
import { InventoryToolbar } from "@/components/admin/inventory/InventoryToolbar";
import { logError } from "@/lib/utils/log";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StockStatus = "in_stock" | "archived";

const PAGE_SIZE = 100;
const LIVE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const LIVE_DATE_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const LIVE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

interface InventoryClientProps {
  initialProducts: ProductWithDetails[];
  initialTotal: number;
  initialSkuTotal: number;
  initialInventoryUnitTotal: number;
  initialFilters: {
    q?: string;
    category?: Category | "all";
    condition?: Condition | "all";
    stockStatus?: StockStatus;
    page?: number;
  };
}

export function InventoryClient({
  initialProducts,
  initialTotal,
  initialSkuTotal,
  initialInventoryUnitTotal,
  initialFilters,
}: InventoryClientProps) {
  const router = useRouter();

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
  const [detailsSelection, setDetailsSelection] = useState<{
    product: ProductWithDetails;
    variant: ProductVariantRow;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [pendingMassDelete, setPendingMassDelete] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<{
    mode: "single" | "selected";
    id?: string;
    label?: string;
    count?: number;
  } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    mode: "selected";
    count?: number;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const filtersRef = useRef<{
    q?: string;
    category?: Category | "all";
    condition?: Condition | "all";
    stockStatus?: StockStatus;
    page?: number;
  }>({});
  const refreshTimerRef = useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingEnd = totalCount === 0 ? 0 : Math.min(page * PAGE_SIZE, totalCount);
  const currentPageIds = products.map((product) => product.id);
  const currentPageAllSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectAllMatching ? totalCount : selectedIds.length;

  const exportInventory = async () => {
    try {
      const f = filtersRef.current;

      const params = new URLSearchParams();
      if (f.q) {
        params.set("q", f.q.trim());
      }
      if (f.category && f.category !== "all") {
        params.set("category", String(f.category));
      }
      if (f.condition && f.condition !== "all") {
        params.set("condition", String(f.condition));
      }
      if (f.stockStatus) {
        params.set("stockStatus", f.stockStatus);
      }

      const res = await fetch(`/api/admin/products/export?${params.toString()}`);
      if (!res.ok) {
        showToast("Failed to export inventory.", "error");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const today = new Date().toISOString().slice(0, 10);
      a.download = `inventory-${today}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      showToast("Inventory exported.", "success");
    } catch {
      showToast("Error exporting inventory.", "error");
    }
  };

  const updateURL = useCallback(
    (filters: {
      q?: string;
      category?: Category | "all";
      condition?: Condition | "all";
      stockStatus?: StockStatus;
      page?: number;
    }) => {
      const params = new URLSearchParams();

      if (filters.q?.trim()) {
        params.set("q", filters.q.trim());
      }
      if (filters.category && filters.category !== "all") {
        params.set("category", filters.category);
      }
      if (filters.condition && filters.condition !== "all") {
        params.set("condition", filters.condition);
      }
      if (filters.stockStatus && filters.stockStatus !== "in_stock") {
        params.set("stockStatus", filters.stockStatus);
      }
      if ((filters.page ?? 1) > 1) {
        params.set("page", String(filters.page));
      }

      const query = params.toString();
      router.replace(query ? `/admin/inventory?${query}` : "/admin/inventory", {
        scroll: false,
      });
    },
    [router],
  );

  const loadProducts = useCallback(
    async (
      filters?: {
        q?: string;
        category?: Category | "all";
        condition?: Condition | "all";
        stockStatus?: StockStatus;
        page?: number;
      },
      showLoading = true,
    ) => {
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          page: String(filters?.page ?? 1),
          includeOutOfStock: "1",
          searchMode: "inventory",
        });

        if (filters?.q) {
          params.set("q", filters.q.trim());
        }
        if (filters?.category && filters.category !== "all") {
          params.append("category", filters.category);
        }
        if (filters?.condition && filters.condition !== "all") {
          params.append("condition", filters.condition);
        }
        if (filters?.stockStatus) {
          params.set("stockStatus", filters.stockStatus);
        }

        const response = await fetch(`/api/admin/products?${params.toString()}`);
        const data = await response.json();

        const loaded: ProductWithDetails[] = data.products || [];
        setProducts(loaded);
        setTotalCount(Number(data.total ?? 0));
        setSkuTotalCount(Number(data.skuTotal ?? data.total ?? 0));
        setInventoryUnitTotalCount(Number(data.inventoryUnitTotal ?? 0));

        // Update URL
        updateURL(filters || {});
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_inventory_products" });
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [updateURL],
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, conditionFilter, stockStatusFilter]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectAllMatching(false);
    setExpandedVariants({});
  }, [page, searchQuery, categoryFilter, conditionFilter, stockStatusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    filtersRef.current = {
      q: searchQuery,
      category: categoryFilter,
      condition: conditionFilter,
      stockStatus: stockStatusFilter,
      page,
    };

    const timeout = setTimeout(() => {
      loadProducts(filtersRef.current);
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    searchQuery,
    categoryFilter,
    conditionFilter,
    stockStatusFilter,
    page,
    loadProducts,
  ]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const activeMenus = Array.from(
        document.querySelectorAll(`[data-menu-id="${openMenuId}"]`),
      );
      if (target && activeMenus.some((menu) => menu.contains(target))) {
        return;
      }
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        loadProducts(filtersRef.current, false);
      }, 300);
    };

    const channel = supabase
      .channel("admin-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  const showToast = (message: string, tone: "success" | "error" | "info" = "info") => {
    setToast({ message, tone });
  };

  const getProductRawTitle = (product: ProductWithDetails) =>
    product.name?.trim() || "Item";

  const getPrimaryImageUrl = (product: ProductWithDetails) => {
    const primary =
      product.images.find((image) => image.is_primary) ?? product.images[0] ?? null;
    return primary?.url ?? null;
  };

  const getProductTotalStock = (product: ProductWithDetails) =>
    product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);

  const getProductLiveState = (product: ProductWithDetails) => {
    if (product.archived_at) {
      return {
        isLive: false,
        label: "Archived",
        detail: "Website only",
        detailTooltip: "Archived products are hidden from customers and read-only",
      };
    }

    if (!product.is_active) {
      return {
        isLive: false,
        label: "Inactive",
        detail: "Hidden",
        detailTooltip: "Not visible to customers",
      };
    }

    const goLiveAt = product.go_live_at;
    const parsed = goLiveAt ? Date.parse(goLiveAt) : Number.NaN;
    if (!Number.isFinite(parsed)) {
      return {
        isLive: true,
        label: "Live",
        detail: null,
        detailTooltip: null,
      };
    }

    if (parsed <= Date.now()) {
      return {
        isLive: true,
        label: "Live",
        detail: null,
        detailTooltip: null,
      };
    }

    const scheduledAt = new Date(parsed);
    const includeYear = scheduledAt.getFullYear() !== new Date().getFullYear();
    const dateText = includeYear
      ? LIVE_DATE_WITH_YEAR_FORMATTER.format(scheduledAt)
      : LIVE_DATE_FORMATTER.format(scheduledAt);
    const timeText = LIVE_TIME_FORMATTER.format(scheduledAt);

    return {
      isLive: false,
      label: "Scheduled",
      detail: `${dateText} · ${timeText}`,
      detailTooltip: `${dateText}, ${timeText}`,
    };
  };

  const toggleVariants = (productId: string) => {
    setExpandedVariants((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const openDetailsModal = (product: ProductWithDetails, variant: ProductVariantRow) => {
    setDetailsSelection({ product, variant });
  };

  const requestDelete = (product: ProductWithDetails) => {
    setOpenMenuId(null);
    const label = getProductRawTitle(product);
    setPendingDelete({ id: product.id, label: label || "this product" });
  };

  const requestArchive = (product: ProductWithDetails) => {
    setOpenMenuId(null);
    setPendingArchive({
      mode: "single",
      id: product.id,
      label: getProductRawTitle(product) || "this product",
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const { id, label } = pendingDelete;
    setPendingDelete(null);

    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      const errorMessage =
        payload &&
        typeof payload === "object" &&
        typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "Failed to delete product.";

      if (response.ok) {
        showToast(`Deleted ${label}.`, "success");
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
          stockStatus: stockStatusFilter,
          page,
        });
      } else {
        showToast(errorMessage, "error");
      }
    } catch {
      showToast("Error deleting product.", "error");
    }
  };

  const confirmMassDelete = async () => {
    setPendingMassDelete(false);
    if (selectedCount === 0) {
      return;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectAllMatching
            ? {
                action: "delete",
                selectionMode: "filtered",
                filters: {
                  q: searchQuery || undefined,
                  category: categoryFilter !== "all" ? [categoryFilter] : undefined,
                  condition: conditionFilter !== "all" ? [conditionFilter] : undefined,
                  stockStatus: stockStatusFilter,
                },
              }
            : {
                action: "delete",
                selectionMode: "ids",
                ids: selectedIds,
              },
        ),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error || "Failed to delete selected items.", "error");
        return;
      }

      const deletedCount = Number(payload?.deletedCount ?? 0);
      const failedCount = Number(payload?.failedCount ?? 0);

      if (failedCount > 0) {
        showToast(`Deleted ${deletedCount} items, ${failedCount} failed.`, "error");
      } else {
        showToast(`Deleted ${deletedCount} items.`, "success");
      }

      clearSelection();
      await loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
        stockStatus: stockStatusFilter,
        page,
      });
    } catch {
      showToast("Error deleting selected items.", "error");
    }
  };

  const restoreProduct = async (productId: string) => {
    setOpenMenuId(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}?action=restore`, {
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error || "Failed to restore product.", "error");
        return;
      }

      showToast("Product restored.", "success");
      setSelectedIds((prev) => prev.filter((id) => id !== productId));
      await loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
        stockStatus: stockStatusFilter,
        page,
      });
    } catch {
      showToast("Error restoring product.", "error");
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore || selectedCount === 0) {
      setPendingRestore(null);
      return;
    }

    setPendingRestore(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectAllMatching
            ? {
                action: "restore",
                selectionMode: "filtered",
                filters: {
                  q: searchQuery || undefined,
                  category: categoryFilter !== "all" ? [categoryFilter] : undefined,
                  condition: conditionFilter !== "all" ? [conditionFilter] : undefined,
                  stockStatus: "archived",
                },
              }
            : {
                action: "restore",
                selectionMode: "ids",
                ids: selectedIds,
              },
        ),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error || "Failed to restore selected products.", "error");
        return;
      }

      showToast(
        `Restored ${payload?.restoredCount ?? pendingRestore.count ?? selectedCount} products.`,
        "success",
      );
      clearSelection();
      await loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
        stockStatus: stockStatusFilter,
        page,
      });
    } catch {
      showToast("Error restoring selected products.", "error");
    }
  };

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null);
    try {
      const response = await fetch(`/api/admin/products/${id}/duplicate`, {
        method: "POST",
      });
      if (response.ok) {
        showToast("Product duplicated.", "success");
        await loadProducts({
          q: searchQuery,
          category: categoryFilter,
          condition: conditionFilter,
          stockStatus: stockStatusFilter,
          page,
        });
      } else {
        showToast("Failed to duplicate product.", "error");
      }
    } catch {
      showToast("Error duplicating product.", "error");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectAllMatching(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectCurrentPage = (checked: boolean) => {
    setSelectAllMatching(false);
    setSelectedIds(checked ? currentPageIds : []);
  };

  const handleMassDelete = () => {
    if (selectedCount === 0) {
      return;
    }
    setPendingMassDelete(true);
  };

  const handleMassRestore = () => {
    if (selectedCount === 0 || stockStatusFilter !== "archived") {
      return;
    }

    setPendingRestore({
      mode: "selected",
      count: selectedCount,
    });
  };

  const handleSelectAllMatching = () => {
    if (selectedIds.length === 0) {
      return;
    }

    setSelectAllMatching(true);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectAllMatching(false);
  };

  const confirmArchive = async () => {
    if (!pendingArchive) {
      return;
    }

    const archiveTarget = pendingArchive;
    setPendingArchive(null);

    try {
      if (archiveTarget.mode === "single" && archiveTarget.id) {
        const response = await fetch(
          `/api/admin/products/${archiveTarget.id}?action=archive`,
          {
            method: "PATCH",
          },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          showToast(payload?.error || "Failed to archive product.", "error");
          return;
        }
        showToast(`Archived ${archiveTarget.label}.`, "success");
      } else {
        const response = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            selectAllMatching
              ? {
                  action: "archive",
                  selectionMode: "filtered",
                  filters: {
                    q: searchQuery || undefined,
                    category: categoryFilter !== "all" ? [categoryFilter] : undefined,
                    condition: conditionFilter !== "all" ? [conditionFilter] : undefined,
                    stockStatus:
                      stockStatusFilter === "archived" ? "all" : stockStatusFilter,
                  },
                }
              : {
                  action: "archive",
                  selectionMode: "ids",
                  ids: selectedIds,
                },
          ),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          showToast(payload?.error || "Failed to archive selected products.", "error");
          return;
        }
        showToast(
          `Archived ${payload?.archivedCount ?? archiveTarget.count ?? selectedCount} products.`,
          "success",
        );
        clearSelection();
      }

      await loadProducts({
        q: searchQuery,
        category: categoryFilter,
        condition: conditionFilter,
        stockStatus: stockStatusFilter,
        page,
      });
    } catch {
      showToast("Error archiving product.", "error");
    }
  };

  const handleMassArchive = () => {
    if (selectedCount === 0 || stockStatusFilter === "archived") {
      return;
    }

    setPendingArchive({
      mode: "selected",
      count: selectedCount,
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        description={`${skuTotalCount} unique SKUs · ${totalCount} total products · ${inventoryUnitTotalCount} total inventory units`}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void exportInventory()}
              aria-label="Export inventory"
              className={`${adminButtonStyles.secondary} gap-1 sm:gap-2`}
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Export Inventory</span>
            </button>

            <Link
              href="/admin/inventory/create"
              aria-label="Create product"
              className={`${adminButtonStyles.primary} gap-1 sm:gap-2`}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Create Product</span>
            </Link>
          </div>
        }
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

      {isLoading ? (
        <AdminEmptyState
          title="Loading Inventory"
          description="Fetching products and variants."
        />
      ) : (
        <>
          <AdminSectionCard>
            <InventoryProductList
              products={products}
              expandedVariants={expandedVariants}
              selectedIds={selectedIds}
              openMenuId={openMenuId}
              currentPageAllSelected={currentPageAllSelected}
              onToggleCurrentPage={toggleSelectCurrentPage}
              onToggleSelection={toggleSelection}
              onToggleVariants={toggleVariants}
              onToggleMenu={(productId) =>
                setOpenMenuId((prev) => (prev === productId ? null : productId))
              }
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
          </AdminSectionCard>
        </>
      )}

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
