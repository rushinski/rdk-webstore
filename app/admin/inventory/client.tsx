// app/admin/inventory/client.tsx
"use client";

import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  MoreVertical,
  Search,
  Download,
  ChevronDown,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import type {
  ProductWithDetails,
  ProductVariantRow,
  Category,
  Condition,
} from "@/types/domain/product";
import { InventoryProductDetailsModal } from "@/components/admin/inventory/InventoryProductDetailsModal";
import { logError } from "@/lib/utils/log";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { RdkSelect } from "@/components/ui/Select";
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

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";
const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";
const tabActiveStyles = "border-b-2 border-brand-text text-brand-text";
const tabInactiveStyles = "text-brand-muted transition hover:text-brand-text";

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

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-brand-muted">
          Showing products {showingStart}-{showingEnd} of {totalCount}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
            className={paginationButtonStyles}
          >
            Previous
          </button>

          {start > 1 && (
            <button
              type="button"
              onClick={() => setPage(1)}
              className={paginationButtonStyles}
            >
              1
            </button>
          )}
          {start > 2 && <span className="text-brand-muted">...</span>}

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={p === page ? paginationCurrentStyles : paginationButtonStyles}
            >
              {p}
            </button>
          ))}

          {end < totalPages - 1 && <span className="text-brand-muted">...</span>}
          {end < totalPages && (
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              className={paginationButtonStyles}
            >
              {totalPages}
            </button>
          )}

          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoading}
            className={paginationButtonStyles}
          >
            Next
          </button>
        </div>
      </div>
    );
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

      <div className="space-y-1 text-sm text-brand-muted">
        <p>
          {totalCount} total products
          {totalCount > 0 && (
            <span>
              {" "}
              (showing {showingStart}-{showingEnd})
            </span>
          )}
        </p>
      </div>

      <div className="flex space-x-6 border-b border-brand-border">
        <button
          onClick={() => setStockStatusFilter("in_stock")}
          className={`py-3 text-sm font-medium ${
            stockStatusFilter === "in_stock" ? tabActiveStyles : tabInactiveStyles
          }`}
          data-testid="inventory-filter-in-stock"
        >
          In Stock
        </button>
        <button
          onClick={() => setStockStatusFilter("archived")}
          className={`py-3 text-sm font-medium ${
            stockStatusFilter === "archived" ? tabActiveStyles : tabInactiveStyles
          }`}
          data-testid="inventory-filter-archived"
        >
          Archived
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex w-full items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2 lg:max-w-md">
          <Search className="h-4 w-4 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search raw names or SKU"
            className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
          />
        </div>

        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-56">
            <RdkSelect
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as Category | "all")}
              options={[
                { value: "all", label: "All categories" },
                { value: "sneakers", label: "Sneakers" },
                { value: "clothing", label: "Clothing" },
                { value: "accessories", label: "Accessories" },
                { value: "electronics", label: "Electronics" },
              ]}
            />
          </div>

          <div className="w-full sm:w-48">
            <RdkSelect
              value={conditionFilter}
              onChange={(v) => setConditionFilter(v as Condition | "all")}
              options={[
                { value: "all", label: "All conditions" },
                { value: "new", label: "New" },
                { value: "used", label: "Pre-owned" },
              ]}
            />
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-col gap-3 border border-brand-border bg-brand-surface p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-brand-text">
              {selectAllMatching
                ? `All ${selectedCount} matching products selected`
                : `${selectedCount} selected`}
            </span>
            {!selectAllMatching &&
              currentPageAllSelected &&
              totalCount > selectedIds.length && (
                <button
                  type="button"
                  onClick={handleSelectAllMatching}
                  className="text-brand-text transition hover:text-black"
                >
                  Select all {totalCount} products
                </button>
              )}
            <button
              type="button"
              onClick={clearSelection}
              className="text-brand-muted transition hover:text-brand-text"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stockStatusFilter === "archived" ? (
              <button
                onClick={handleMassRestore}
                className="flex cursor-pointer items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 transition hover:bg-emerald-100"
              >
                <RotateCcw className="h-4 w-4" />
                Unarchive Selected
              </button>
            ) : (
              <button
                onClick={handleMassArchive}
                className="flex cursor-pointer items-center gap-2 border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100"
              >
                <Archive className="h-4 w-4" />
                Archive Selected
              </button>
            )}
            <button
              onClick={handleMassDelete}
              className={`${adminButtonStyles.secondary} cursor-pointer gap-2`}
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <AdminEmptyState
          title="Loading Inventory"
          description="Fetching products and variants."
        />
      ) : (
        <>
          {/* Desktop Table */}
          <AdminSectionCard>
            <div className="relative hidden overflow-visible border border-brand-border bg-brand-surface md:block">
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
                    <th className="text-left px-4 py-3">
                      <input
                        type="checkbox"
                        className="rdk-checkbox"
                        onChange={(e) => toggleSelectCurrentPage(e.target.checked)}
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
                    const rawTitle = getProductRawTitle(product);
                    const totalStock = getProductTotalStock(product);
                    const primaryImageUrl = getPrimaryImageUrl(product);
                    const variantsOpen = expandedVariants[product.id] ?? false;
                    const liveState = getProductLiveState(product);

                    return (
                      <Fragment key={product.id}>
                        <tr
                          className="cursor-pointer border-b border-brand-border transition hover:bg-brand-page"
                          data-testid="inventory-row"
                          data-product-id={product.id}
                          onClick={() => toggleVariants(product.id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rdk-checkbox"
                              checked={selectedIds.includes(product.id)}
                              onChange={() => toggleSelection(product.id)}
                            />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-brand-border bg-brand-page">
                              {primaryImageUrl ? (
                                <img
                                  src={primaryImageUrl}
                                  alt={rawTitle}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-brand-muted">
                                  No image
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 min-w-0">
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
                            <div className="w-full flex flex-col items-start gap-1 text-left">
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
                          </td>

                          <td
                            className="px-2 py-3 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => toggleVariants(product.id)}
                              className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-brand-text transition hover:text-black"
                            >
                              {variantsOpen ? "Hide variants" : "View variants"}
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${variantsOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </td>

                          <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-start">
                              <div className="relative" data-menu-id={product.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuId((prev) =>
                                      prev === product.id ? null : product.id,
                                    )
                                  }
                                  className="cursor-pointer p-1.5 text-brand-muted transition hover:bg-brand-page hover:text-brand-text"
                                  aria-label="Open actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openMenuId === product.id && (
                                  <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden border border-brand-border bg-brand-surface shadow-xl">
                                    <Link
                                      href={`/admin/inventory/${product.id}/edit`}
                                      onClick={() => setOpenMenuId(null)}
                                      className="block px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page"
                                    >
                                      {product.archived_at ? "View" : "Edit"}
                                    </Link>
                                    {product.archived_at ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void restoreProduct(product.id);
                                        }}
                                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-brand-page"
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                        Restore
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            void handleDuplicate(product.id);
                                          }}
                                          className="w-full cursor-pointer px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-page"
                                        >
                                          Duplicate
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => requestArchive(product)}
                                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-brand-page"
                                        >
                                          <Archive className="h-4 w-4" />
                                          Archive
                                        </button>
                                        <div className="h-px bg-brand-border" />
                                        <button
                                          type="button"
                                          onClick={() => requestDelete(product)}
                                          className="w-full cursor-pointer px-3 py-2 text-left text-sm text-red-700 transition hover:bg-brand-page"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
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
                                      onClick={() => openDetailsModal(product, variant)}
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
                                          ${(variant.unit_cost_cents / 100).toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="w-32 flex-shrink-0">
                                        <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                                          Sale Price
                                        </div>
                                        <div className="text-sm font-bold text-brand-text">
                                          ${(variant.sale_price_cents / 100).toFixed(2)}
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
          </AdminSectionCard>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {products.map((product) => {
              const rawTitle = getProductRawTitle(product);
              const totalStock = getProductTotalStock(product);
              const primaryImageUrl = getPrimaryImageUrl(product);
              const variantsOpen = expandedVariants[product.id] ?? false;
              const liveState = getProductLiveState(product);

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
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-brand-muted">No image</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="truncate font-semibold leading-tight text-brand-text">
                        {rawTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                        <span className="capitalize">{product.category}</span>
                        <span className="text-brand-muted">-</span>
                        <span>Stock: {totalStock}</span>
                      </div>
                      <div className="w-full flex flex-col items-start gap-1 text-left">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
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
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <input
                        type="checkbox"
                        className="rdk-checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                      />

                      <div className="relative" data-menu-id={product.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((prev) =>
                              prev === product.id ? null : product.id,
                            )
                          }
                          className="cursor-pointer p-1.5 text-brand-muted transition hover:bg-brand-page hover:text-brand-text"
                          aria-label="Open actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === product.id && (
                          <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden border border-brand-border bg-brand-surface shadow-xl">
                            <Link
                              href={`/admin/inventory/${product.id}/edit`}
                              onClick={() => setOpenMenuId(null)}
                              className="block px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page"
                            >
                              {product.archived_at ? "View" : "Edit"}
                            </Link>
                            {product.archived_at ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void restoreProduct(product.id);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-brand-page"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDuplicate(product.id);
                                  }}
                                  className="w-full cursor-pointer px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-page"
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestArchive(product)}
                                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-brand-page"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </button>
                                <div className="h-px bg-brand-border" />
                                <button
                                  type="button"
                                  onClick={() => requestDelete(product)}
                                  className="w-full cursor-pointer px-3 py-2 text-left text-sm text-red-700 transition hover:bg-brand-page"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-brand-border pt-3">
                    <button
                      type="button"
                      onClick={() => toggleVariants(product.id)}
                      className="inline-flex items-center gap-1 text-sm text-brand-text transition hover:text-black"
                    >
                      {variantsOpen ? "Hide variants" : "View variants"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${variantsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <span className="text-[11px] text-brand-muted">
                      {product.variants.length} variants
                    </span>
                  </div>

                  {variantsOpen && (
                    <div className="mt-3 space-y-2 border-t border-brand-border pt-3">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          onClick={() => openDetailsModal(product, variant)}
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
                              <span className="text-brand-muted">Unit Cost:</span> $
                              {(variant.unit_cost_cents / 100).toFixed(2)}
                            </span>
                            <span>
                              <span className="text-brand-muted">Sale Price:</span> $
                              {(variant.sale_price_cents / 100).toFixed(2)}
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
      )}

      {!isLoading && renderPagination()}

      <InventoryProductDetailsModal
        open={Boolean(detailsSelection)}
        product={detailsSelection?.product ?? null}
        variant={detailsSelection?.variant ?? null}
        onClose={() => setDetailsSelection(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete product?"
        description={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.label} and its variants.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        isOpen={pendingMassDelete}
        title="Delete selected products?"
        description={`This will permanently remove ${selectedCount} products and their variants.`}
        confirmLabel="Delete all"
        onConfirm={() => {
          void confirmMassDelete();
        }}
        onCancel={() => setPendingMassDelete(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingArchive)}
        title={
          pendingArchive?.mode === "selected"
            ? "Archive selected products?"
            : "Archive product?"
        }
        description={
          pendingArchive?.mode === "selected"
            ? `This will move ${pendingArchive.count ?? selectedCount} products to the Archived tab. This is a website-only state and will not change Lightspeed.`
            : pendingArchive?.label
              ? `This will move ${pendingArchive.label} to the Archived tab. This is a website-only state and will not change Lightspeed.`
              : undefined
        }
        confirmLabel="Archive"
        onConfirm={() => {
          void confirmArchive();
        }}
        onCancel={() => setPendingArchive(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingRestore)}
        title="Unarchive selected products?"
        description={`This will restore ${pendingRestore?.count ?? selectedCount} products to active inventory so they can appear in the normal tabs again.`}
        confirmLabel="Unarchive"
        onConfirm={() => {
          void confirmRestore();
        }}
        onCancel={() => setPendingRestore(null)}
      />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
