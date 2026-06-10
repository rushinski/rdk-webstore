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

type StockStatus = "in_stock" | "out_of_stock" | "archived";

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
  initialFilters: {
    q?: string;
    category?: Category | "all";
    condition?: Condition | "all";
    stockStatus?: StockStatus;
    page?: number;
  };
}

type ReconciliationPreview = {
  matchedCount: number;
  importCount: number;
  archiveCount: number;
  conflictCount: number;
  matched: Array<{
    websiteProductId: string;
    remoteProductId: string;
    reason: "link" | "sku";
    skuMatches: string[];
  }>;
  imports: Array<{
    remoteProductId: string;
    title: string;
    skuSample: string | null;
  }>;
  archives: Array<{
    websiteProductId: string;
    title: string;
    skuSample: string | null;
  }>;
  conflicts: Array<{
    remoteProductId: string;
    title: string;
    candidateWebsiteProductIds: string[];
    skuMatches: string[];
  }>;
};

type WebsiteArchiveCandidate = {
  websiteProductId: string;
  title: string;
  skuSample: string | null;
};

type SyncModalStage = "preview_scanning" | "preview_summary" | "applying";

type PreviewScanState = {
  status: "scanning" | "error";
  currentLabel: string;
  processedCount: number;
  totalCount: number | null;
  currentPage: number;
  matchedCount: number;
  importCount: number;
  archiveCount: number;
  conflictCount: number;
  estimatedSecondsRemaining: number | null;
};

type SyncProgressState = {
  phase: "preparing" | "importing" | "archiving" | "finishing" | "complete" | "error";
  completedUnits: number;
  totalUnits: number;
  currentLabel: string;
  importedCount: number;
  archivedCount: number;
  failedCount: number;
};

type PreviewScanChunkResult = {
  chunkIndex: number;
  after: number | null;
  nextAfter: number | null;
  pageSize: number;
  processedCount: number;
  totalRemoteProducts: number | null;
  hasNextPage: boolean;
  nextPage: number | null;
  preview: Omit<ReconciliationPreview, "archives" | "archiveCount"> & {
    archiveCount: 0;
    archives: [];
  };
  websiteCandidates: WebsiteArchiveCandidate[];
};

type PreviewScanChunkResponse = {
  error?: string;
  result?: PreviewScanChunkResult;
};

const IMPORT_CHUNK_SIZE = 10;
const ARCHIVE_CHUNK_SIZE = 25;
const PREVIEW_SCAN_PAGE_SIZE = 25;

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function InventoryClient({
  initialProducts,
  initialTotal,
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
  const [syncPreview, setSyncPreview] = useState<ReconciliationPreview | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncModalStage, setSyncModalStage] = useState<SyncModalStage>("preview_summary");
  const [syncLoading, setSyncLoading] = useState(false);
  const [previewScanState, setPreviewScanState] = useState<PreviewScanState | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgressState | null>(null);
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

  const loadSyncPreview = async () => {
    try {
      setSyncDialogOpen(true);
      setSyncLoading(true);
      setSyncModalStage("preview_scanning");
      setSyncPreview(null);
      setSyncProgress(null);
      setPreviewScanState({
        status: "scanning",
        currentLabel: "Preparing preview scan...",
        processedCount: 0,
        totalCount: null,
        currentPage: 0,
        matchedCount: 0,
        importCount: 0,
        archiveCount: 0,
        conflictCount: 0,
        estimatedSecondsRemaining: null,
      });

      const websiteCandidates = new Map<string, WebsiteArchiveCandidate>();
      const matchedWebsiteProductIds = new Set<string>();
      const conflictWebsiteProductIds = new Set<string>();
      const matched: ReconciliationPreview["matched"] = [];
      const imports: ReconciliationPreview["imports"] = [];
      const conflicts: ReconciliationPreview["conflicts"] = [];
      let processedCount = 0;
      let scanChunkIndex = 1;
      let scanAfter: number | null = null;
      let hasNextPage = true;
      const startedAtMs = Date.now();

      while (hasNextPage) {
        const response: Response = await fetch("/api/admin/lightspeed/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "scan_preview_chunk",
            after: scanAfter,
            pageSize: PREVIEW_SCAN_PAGE_SIZE,
            chunkIndex: scanChunkIndex,
          }),
        });
        const payload: PreviewScanChunkResponse | null = await response
          .json()
          .catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to preview inventory sync.");
        }

        const result: PreviewScanChunkResult | undefined = payload?.result;
        const chunkPreview = result?.preview;
        const chunkWebsiteCandidates = Array.isArray(result?.websiteCandidates)
          ? (result.websiteCandidates as WebsiteArchiveCandidate[])
          : [];

        for (const candidate of chunkWebsiteCandidates) {
          websiteCandidates.set(candidate.websiteProductId, candidate);
        }
        for (const item of chunkPreview?.matched ?? []) {
          matched.push(item);
          matchedWebsiteProductIds.add(item.websiteProductId);
        }
        for (const item of chunkPreview?.imports ?? []) {
          imports.push(item);
        }
        for (const item of chunkPreview?.conflicts ?? []) {
          conflicts.push(item);
          for (const websiteProductId of item.candidateWebsiteProductIds) {
            conflictWebsiteProductIds.add(websiteProductId);
          }
        }

        processedCount += Number(result?.processedCount ?? 0);
        hasNextPage = Boolean(result?.hasNextPage);
        const remoteTotalCount =
          typeof result?.totalRemoteProducts === "number"
            ? result.totalRemoteProducts
            : null;
        const elapsedSeconds = Math.max(1, (Date.now() - startedAtMs) / 1000);
        const rate = processedCount / elapsedSeconds;
        const remainingCount =
          typeof remoteTotalCount === "number"
            ? Math.max(remoteTotalCount - processedCount, 0)
            : null;
        const estimatedSecondsRemaining =
          remainingCount !== null && rate > 0
            ? Math.max(Math.round(remainingCount / rate), 0)
            : null;
        const archiveCount = Math.max(
          websiteCandidates.size -
            new Set([...matchedWebsiteProductIds, ...conflictWebsiteProductIds]).size,
          0,
        );

        setPreviewScanState({
          status: "scanning",
          currentLabel: `Scanning chunk ${result?.chunkIndex ?? scanChunkIndex}${remoteTotalCount ? ` of up to ~${Math.max(Math.ceil(remoteTotalCount / PREVIEW_SCAN_PAGE_SIZE), 1)}` : ""}`,
          processedCount,
          totalCount: remoteTotalCount,
          currentPage: Number(result?.chunkIndex ?? scanChunkIndex),
          matchedCount: matched.length,
          importCount: imports.length,
          archiveCount,
          conflictCount: conflicts.length,
          estimatedSecondsRemaining,
        });

        scanAfter =
          typeof result?.nextAfter === "number" ? Number(result.nextAfter) : null;
        scanChunkIndex = Number(result?.nextPage ?? scanChunkIndex + 1);
      }

      const archives = Array.from(websiteCandidates.values()).filter(
        (candidate) =>
          !matchedWebsiteProductIds.has(candidate.websiteProductId) &&
          !conflictWebsiteProductIds.has(candidate.websiteProductId),
      );

      setSyncPreview({
        matchedCount: matched.length,
        importCount: imports.length,
        archiveCount: archives.length,
        conflictCount: conflicts.length,
        matched,
        imports,
        archives,
        conflicts,
      });
      setSyncModalStage("preview_summary");
      setPreviewScanState((prev) =>
        prev
          ? {
              ...prev,
              currentLabel: "Preview scan complete.",
              archiveCount: archives.length,
            }
          : prev,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error previewing inventory sync.";
      setPreviewScanState((prev) => ({
        status: "error",
        currentLabel: message,
        processedCount: prev?.processedCount ?? 0,
        totalCount: prev?.totalCount ?? null,
        currentPage: prev?.currentPage ?? 0,
        matchedCount: prev?.matchedCount ?? 0,
        importCount: prev?.importCount ?? 0,
        archiveCount: prev?.archiveCount ?? 0,
        conflictCount: prev?.conflictCount ?? 0,
        estimatedSecondsRemaining: prev?.estimatedSecondsRemaining ?? null,
      }));
      showToast(message, "error");
    } finally {
      setSyncLoading(false);
    }
  };

  const applySync = async () => {
    if (!syncPreview) {
      return;
    }

    try {
      setSyncLoading(true);
      setSyncModalStage("applying");
      const totalUnits = syncPreview.importCount + syncPreview.archiveCount;
      const importChunks = chunkArray(
        syncPreview.imports.map((item) => item.remoteProductId),
        IMPORT_CHUNK_SIZE,
      );
      const archiveChunks = chunkArray(
        syncPreview.archives.map((item) => item.websiteProductId),
        ARCHIVE_CHUNK_SIZE,
      );

      setSyncProgress({
        phase: totalUnits === 0 ? "complete" : "preparing",
        completedUnits: 0,
        totalUnits,
        currentLabel: totalUnits === 0 ? "Nothing to sync." : "Preparing sync...",
        importedCount: 0,
        archivedCount: 0,
        failedCount: 0,
      });
      let importedCount = 0;
      let archivedCount = 0;
      let failedCount = 0;

      if (totalUnits === 0) {
        showToast("Sync complete. Nothing needed to change.", "success");
        await loadProducts(filtersRef.current);
        return;
      }

      for (const [index, chunk] of importChunks.entries()) {
        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "importing",
                currentLabel: `Importing ${Math.min(index * IMPORT_CHUNK_SIZE + 1, syncPreview.importCount)}-${Math.min((index + 1) * IMPORT_CHUNK_SIZE, syncPreview.importCount)} of ${syncPreview.importCount}`,
              }
            : prev,
        );

        const response = await fetch("/api/admin/lightspeed/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply_import_chunk",
            remoteProductIds: chunk,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to apply inventory sync.");
        }

        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                completedUnits: prev.completedUnits + chunk.length,
                importedCount:
                  prev.importedCount + Number(payload?.result?.importedCount ?? 0),
                failedCount: prev.failedCount + Number(payload?.result?.failedCount ?? 0),
              }
            : prev,
        );
        importedCount += Number(payload?.result?.importedCount ?? 0);
        failedCount += Number(payload?.result?.failedCount ?? 0);
      }

      for (const [index, chunk] of archiveChunks.entries()) {
        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "archiving",
                currentLabel: `Archiving ${Math.min(index * ARCHIVE_CHUNK_SIZE + 1, syncPreview.archiveCount)}-${Math.min((index + 1) * ARCHIVE_CHUNK_SIZE, syncPreview.archiveCount)} of ${syncPreview.archiveCount}`,
              }
            : prev,
        );

        const response = await fetch("/api/admin/lightspeed/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply_archive_chunk",
            websiteProductIds: chunk,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to apply inventory sync.");
        }

        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                completedUnits: prev.completedUnits + chunk.length,
                archivedCount:
                  prev.archivedCount + Number(payload?.result?.archivedCount ?? 0),
                failedCount: prev.failedCount + Number(payload?.result?.failedCount ?? 0),
              }
            : prev,
        );
        archivedCount += Number(payload?.result?.archivedCount ?? 0);
        failedCount += Number(payload?.result?.failedCount ?? 0);
      }

      setSyncProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: "finishing",
              currentLabel: "Refreshing inventory...",
            }
          : prev,
      );

      await loadProducts(filtersRef.current);

      setSyncProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: "complete",
              currentLabel: "Sync complete.",
            }
          : prev,
      );

      showToast(
        `Sync complete. Imported ${importedCount}, archived ${archivedCount}, conflicts ${syncPreview.conflictCount}${failedCount > 0 ? `, failures ${failedCount}` : ""}.`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error applying inventory sync.";
      setSyncProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: "error",
              currentLabel: message,
            }
          : prev,
      );
      showToast(message, "error");
    } finally {
      setSyncLoading(false);
    }
  };

  // Update URL when filters change
  const updateURL = useCallback(
    (filters: {
      q?: string;
      category?: Category | "all";
      condition?: Condition | "all";
      stockStatus?: StockStatus;
      page?: number;
    }) => {
      const params = new URLSearchParams();

      if (filters.q) {
        params.set("q", filters.q);
      }
      if (filters.category && filters.category !== "all") {
        params.set("category", filters.category);
      }
      if (filters.condition && filters.condition !== "all") {
        params.set("condition", filters.condition);
      }
      if (filters.stockStatus) {
        params.set("stockStatus", filters.stockStatus);
      }
      if (filters.page && filters.page > 1) {
        params.set("page", String(filters.page));
      }

      const queryString = params.toString();
      router.push(`/admin/inventory${queryString ? `?${queryString}` : ""}`, {
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

  const syncProgressPercent = syncProgress
    ? syncProgress.totalUnits > 0
      ? Math.min(
          100,
          Math.round((syncProgress.completedUnits / syncProgress.totalUnits) * 100),
        )
      : 100
    : 0;
  const previewScanPercent = previewScanState
    ? previewScanState.totalCount && previewScanState.totalCount > 0
      ? Math.min(
          100,
          Math.round(
            (previewScanState.processedCount / previewScanState.totalCount) * 100,
          ),
        )
      : 10
    : 0;
  const previewItemsRemaining =
    previewScanState && typeof previewScanState.totalCount === "number"
      ? Math.max(previewScanState.totalCount - previewScanState.processedCount, 0)
      : null;

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
        <div className="text-sm text-gray-400">
          Showing {showingStart}-{showingEnd} of {totalCount}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
          >
            Previous
          </button>

          {start > 1 && (
            <button
              type="button"
              onClick={() => setPage(1)}
              className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
            >
              1
            </button>
          )}
          {start > 2 && <span className="text-gray-500">...</span>}

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`px-3 py-2 rounded-sm border text-sm ${
                p === page
                  ? "border-red-600 text-white"
                  : "border-zinc-800/70 text-gray-300"
              }`}
            >
              {p}
            </button>
          ))}

          {end < totalPages - 1 && <span className="text-gray-500">...</span>}
          {end < totalPages && (
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
            >
              {totalPages}
            </button>
          )}

          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoading}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Inventory</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void loadSyncPreview();
              }}
              aria-label="Sync inventory"
              disabled={syncLoading}
              className="flex items-center gap-1 rounded border border-zinc-800/70 bg-zinc-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
            >
              <RotateCcw
                className={`h-4 w-4 sm:h-5 sm:w-5 ${syncLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {syncLoading ? "Syncing..." : "Sync Inventory"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void exportInventory()}
              aria-label="Export inventory"
              className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-3 py-2 text-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-base transition cursor-pointer rounded border border-zinc-800/70"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Export Inventory</span>
            </button>

            <Link
              href="/admin/inventory/create"
              aria-label="Create product"
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 text-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-base transition cursor-pointer rounded"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Create Product</span>
            </Link>
          </div>
        </div>
        <p className="text-gray-400">
          {totalCount} products
          {totalCount > 0 && (
            <span className="text-gray-500">
              {" "}
              (Showing {showingStart}-{showingEnd})
            </span>
          )}
        </p>
      </div>

      <div className="border-b border-zinc-800/70 flex space-x-6">
        <button
          onClick={() => setStockStatusFilter("in_stock")}
          className={`py-3 text-sm font-medium transition-colors ${
            stockStatusFilter === "in_stock"
              ? "text-white border-b-2 border-red-600"
              : "text-gray-400 hover:text-white"
          }`}
          data-testid="inventory-filter-in-stock"
        >
          In Stock
        </button>
        <button
          onClick={() => setStockStatusFilter("out_of_stock")}
          className={`py-3 text-sm font-medium transition-colors ${
            stockStatusFilter === "out_of_stock"
              ? "text-white border-b-2 border-red-600"
              : "text-gray-400 hover:text-white"
          }`}
          data-testid="inventory-filter-out-of-stock"
        >
          Out of Stock
        </button>
        <button
          onClick={() => setStockStatusFilter("archived")}
          className={`py-3 text-sm font-medium transition-colors ${
            stockStatusFilter === "archived"
              ? "text-white border-b-2 border-red-600"
              : "text-gray-400 hover:text-white"
          }`}
          data-testid="inventory-filter-archived"
        >
          Archived
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 w-full lg:max-w-md rounded
                        focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-700/40"
        >
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search raw names or SKU"
            className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none
                       focus:outline-none focus-visible:outline-none focus-visible:ring-0"
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
        <div className="flex flex-col gap-3 rounded border border-zinc-800/70 bg-zinc-900 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-white">
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
                  className="text-red-400 transition hover:text-red-300"
                >
                  Select all {totalCount} products
                </button>
              )}
            <button
              type="button"
              onClick={clearSelection}
              className="text-zinc-400 transition hover:text-white"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stockStatusFilter === "archived" ? (
              <button
                onClick={handleMassRestore}
                className="flex cursor-pointer items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700"
              >
                <RotateCcw className="h-4 w-4" />
                Unarchive Selected
              </button>
            ) : (
              <button
                onClick={handleMassArchive}
                className="flex cursor-pointer items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
              >
                <Archive className="h-4 w-4" />
                Archive Selected
              </button>
            )}
            <button
              onClick={handleMassDelete}
              className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white transition hover:bg-zinc-800 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-zinc-900 border border-zinc-800/70 rounded overflow-visible relative">
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
                <tr className="border-b border-zinc-800/70 bg-zinc-800">
                  <th className="text-left px-4 py-3">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      onChange={(e) => toggleSelectCurrentPage(e.target.checked)}
                      checked={currentPageAllSelected}
                    />
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">
                    Image
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-4 py-3">
                    Product
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-2 py-3">
                    Category
                  </th>
                  <th className="text-center text-gray-400 font-semibold px-2 py-3">
                    Stock
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-2 py-3">
                    Live Status
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-2 py-3">
                    Variants
                  </th>
                  <th className="text-left text-gray-400 font-semibold px-2 py-3">
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
                        className="border-b border-zinc-800/70 hover:bg-zinc-800 cursor-pointer"
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
                          <div className="w-12 h-12 rounded bg-zinc-800 border border-zinc-800/70 overflow-hidden flex items-center justify-center">
                            {primaryImageUrl ? (
                              <img
                                src={primaryImageUrl}
                                alt={rawTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-500">No image</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 min-w-0">
                          <div className="text-white font-semibold truncate">
                            {rawTitle}
                          </div>
                        </td>

                        <td className="px-2 py-3 text-left text-gray-400 capitalize truncate">
                          {product.category}
                        </td>

                        <td className="px-2 py-3 text-center text-gray-300 whitespace-nowrap">
                          {totalStock}
                        </td>

                        <td className="px-2 py-3 text-left">
                          <div className="w-full flex flex-col items-start gap-1 text-left">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                liveState.isLive
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {liveState.label}
                            </span>
                            {liveState.detail && (
                              <span
                                className="text-[11px] leading-none text-zinc-400 whitespace-nowrap text-left"
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
                            className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-red-400 hover:text-red-300"
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
                                className="cursor-pointer rounded p-1.5 text-gray-400 hover:bg-zinc-900 hover:text-white"
                                aria-label="Open actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === product.id && (
                                <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30 rounded overflow-hidden">
                                  <Link
                                    href={`/admin/inventory/${product.id}/edit`}
                                    onClick={() => setOpenMenuId(null)}
                                    className="block px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800"
                                  >
                                    {product.archived_at ? "View" : "Edit"}
                                  </Link>
                                  {product.archived_at ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void restoreProduct(product.id);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-300 hover:bg-zinc-800 cursor-pointer"
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
                                        className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800 cursor-pointer"
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => requestArchive(product)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-300 hover:bg-zinc-800 cursor-pointer"
                                      >
                                        <Archive className="h-4 w-4" />
                                        Archive
                                      </button>
                                      <div className="h-px bg-zinc-800/70" />
                                      <button
                                        type="button"
                                        onClick={() => requestDelete(product)}
                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 cursor-pointer"
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
                        <tr className="border-b border-zinc-800/70 bg-zinc-900/40">
                          <td colSpan={8} className="p-0">
                            <div className="py-1">
                              <div className="flex flex-col">
                                {product.variants.map((variant) => (
                                  <div
                                    key={variant.id}
                                    onClick={() => openDetailsModal(product, variant)}
                                    className="group flex cursor-pointer items-center justify-start gap-8 px-6 py-4 transition-colors hover:bg-zinc-800/70"
                                  >
                                    <div className="w-36 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-zinc-500">
                                        SKU
                                      </div>
                                      <div className="text-sm font-mono text-zinc-200">
                                        {variant.sku || "N/A"}
                                      </div>
                                    </div>
                                    <div className="w-28 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-zinc-500">
                                        Size
                                      </div>
                                      <div className="text-sm font-medium text-zinc-200">
                                        {variant.size_label}
                                      </div>
                                    </div>
                                    <div className="w-32 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-zinc-500">
                                        Unit Cost
                                      </div>
                                      <div className="text-sm font-medium text-zinc-200">
                                        ${(variant.unit_cost_cents / 100).toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="w-32 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-zinc-500">
                                        Sale Price
                                      </div>
                                      <div className="text-sm font-bold text-white">
                                        ${(variant.sale_price_cents / 100).toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="w-24 flex-shrink-0">
                                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-zinc-500">
                                        Stock
                                      </div>
                                      <div className="text-sm font-medium text-zinc-200">
                                        {variant.stock ?? 0}
                                      </div>
                                    </div>
                                    <div className="w-20 flex-shrink-0">
                                      <span className="text-xs font-medium text-red-500 transition-colors group-hover:text-red-400">
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
                  className="bg-zinc-900 border border-zinc-800/70 rounded p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded bg-zinc-800 border border-zinc-800/70 overflow-hidden flex items-center justify-center">
                      {primaryImageUrl ? (
                        <img
                          src={primaryImageUrl}
                          alt={rawTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-500">No image</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-white font-semibold truncate leading-tight">
                        {rawTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="capitalize">{product.category}</span>
                        <span className="text-zinc-600">•</span>
                        <span>Stock: {totalStock}</span>
                      </div>
                      <div className="w-full flex flex-col items-start gap-1 text-left">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                            liveState.isLive
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {liveState.label}
                        </span>
                        {liveState.detail && (
                          <span
                            className="text-[11px] leading-none text-zinc-400 whitespace-nowrap text-left"
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
                          className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                          aria-label="Open actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === product.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30 rounded overflow-hidden">
                            <Link
                              href={`/admin/inventory/${product.id}/edit`}
                              onClick={() => setOpenMenuId(null)}
                              className="block px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800"
                            >
                              {product.archived_at ? "View" : "Edit"}
                            </Link>
                            {product.archived_at ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void restoreProduct(product.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-300 hover:bg-zinc-800 cursor-pointer"
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
                                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-zinc-800 cursor-pointer"
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestArchive(product)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-300 hover:bg-zinc-800 cursor-pointer"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </button>
                                <div className="h-px bg-zinc-800/70" />
                                <button
                                  type="button"
                                  onClick={() => requestDelete(product)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 cursor-pointer"
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

                  <div className="mt-3 border-t border-zinc-800/70 pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleVariants(product.id)}
                      className="inline-flex items-center gap-1 text-sm text-red-400"
                    >
                      {variantsOpen ? "Hide variants" : "View variants"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${variantsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <span className="text-[11px] text-zinc-500">
                      {product.variants.length} variants
                    </span>
                  </div>

                  {variantsOpen && (
                    <div className="mt-3 space-y-2 border-t border-zinc-800/70 pt-3">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          onClick={() => openDetailsModal(product, variant)}
                          className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3 cursor-pointer transition-colors hover:bg-zinc-800/60"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-200">
                            <span>
                              <span className="text-zinc-500">SKU:</span>{" "}
                              <span className="font-mono">{variant.sku || "N/A"}</span>
                            </span>
                            <span>
                              <span className="text-zinc-500">Size:</span>{" "}
                              {variant.size_label}
                            </span>
                            <span>
                              <span className="text-zinc-500">Unit Cost:</span> $
                              {(variant.unit_cost_cents / 100).toFixed(2)}
                            </span>
                            <span>
                              <span className="text-zinc-500">Sale Price:</span> $
                              {(variant.sale_price_cents / 100).toFixed(2)}
                            </span>
                            <span>
                              <span className="text-zinc-500">Stock:</span>{" "}
                              {variant.stock ?? 0}
                            </span>
                            <span className="text-red-400 hover:text-red-300">
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

      {syncDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!syncLoading) {
                setSyncDialogOpen(false);
              }
            }}
          />
          <div className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded border border-zinc-800 bg-zinc-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Sync Website Inventory
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Compare active website inventory to Lightspeed before applying changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!syncLoading) {
                    setSyncDialogOpen(false);
                  }
                }}
                className="text-gray-400 transition hover:text-white"
                aria-label="Close sync preview"
              >
                ×
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {syncModalStage === "preview_scanning" && previewScanState ? (
                <div className="space-y-5">
                  <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {previewScanState.status === "error"
                            ? "Preview Scan Stopped"
                            : "Scanning Lightspeed Inventory"}
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {previewScanState.currentLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {previewScanState.totalCount
                            ? `${previewScanState.processedCount}/${previewScanState.totalCount}`
                            : previewScanState.processedCount}
                        </div>
                        <div className="text-xs text-zinc-500">items scanned</div>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-zinc-800">
                      <div
                        className={`h-full transition-all ${
                          previewScanState.status === "error"
                            ? "bg-amber-500"
                            : "bg-red-600"
                        }`}
                        style={{ width: `${previewScanPercent}%` }}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Matched
                        </div>
                        <div className="mt-1 text-xl font-semibold text-white">
                          {previewScanState.matchedCount}
                        </div>
                      </div>
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Imports
                        </div>
                        <div className="mt-1 text-xl font-semibold text-emerald-300">
                          {previewScanState.importCount}
                        </div>
                      </div>
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Archives
                        </div>
                        <div className="mt-1 text-xl font-semibold text-amber-300">
                          {previewScanState.archiveCount}
                        </div>
                      </div>
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Conflicts
                        </div>
                        <div className="mt-1 text-xl font-semibold text-red-300">
                          {previewScanState.conflictCount}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                      <span>Current page: {previewScanState.currentPage || 1}</span>
                      <span>
                        {previewItemsRemaining === null
                          ? "Items remaining: estimating..."
                          : `Items remaining: ${previewItemsRemaining}`}
                      </span>
                      <span>
                        {previewScanState.estimatedSecondsRemaining === null
                          ? "ETA: estimating..."
                          : `ETA: ~${previewScanState.estimatedSecondsRemaining}s`}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Archived website products are excluded from this scan and do not
                      count toward the preview totals.
                    </p>
                  </div>
                </div>
              ) : syncModalStage === "applying" && syncProgress ? (
                <div className="space-y-5">
                  <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {syncProgress.phase === "complete"
                            ? "Sync Complete"
                            : syncProgress.phase === "error"
                              ? "Sync Stopped"
                              : "Sync In Progress"}
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {syncProgress.currentLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {syncProgress.completedUnits}/{syncProgress.totalUnits}
                        </div>
                        <div className="text-xs text-zinc-500">work units</div>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-zinc-800">
                      <div
                        className={`h-full transition-all ${
                          syncProgress.phase === "error" ? "bg-amber-500" : "bg-red-600"
                        }`}
                        style={{ width: `${syncProgressPercent}%` }}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Imported
                        </div>
                        <div className="mt-1 text-xl font-semibold text-emerald-300">
                          {syncProgress.importedCount}
                        </div>
                      </div>
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Archived
                        </div>
                        <div className="mt-1 text-xl font-semibold text-amber-300">
                          {syncProgress.archivedCount}
                        </div>
                      </div>
                      <div className="rounded border border-zinc-800/70 bg-zinc-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Failures
                        </div>
                        <div className="mt-1 text-xl font-semibold text-red-300">
                          {syncProgress.failedCount}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Archived website products are excluded from this sync and do not
                      count toward progress.
                    </p>
                  </div>
                </div>
              ) : syncPreview ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Matched
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-white">
                        {syncPreview.matchedCount}
                      </div>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Import
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-300">
                        {syncPreview.importCount}
                      </div>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Archive
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-amber-300">
                        {syncPreview.archiveCount}
                      </div>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Conflicts
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-red-300">
                        {syncPreview.conflictCount}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <h3 className="text-sm font-semibold text-white">Add To Website</h3>
                      <div className="mt-3 space-y-2">
                        {syncPreview.imports.length === 0 ? (
                          <p className="text-sm text-zinc-500">
                            No missing Lightspeed products.
                          </p>
                        ) : (
                          syncPreview.imports.slice(0, 8).map((item) => (
                            <div
                              key={item.remoteProductId}
                              className="rounded border border-zinc-800/70 bg-zinc-900/70 p-2"
                            >
                              <div className="text-sm font-medium text-zinc-100">
                                {item.title}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                SKU: {item.skuSample || "N/A"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <h3 className="text-sm font-semibold text-white">
                        Archive On Website
                      </h3>
                      <div className="mt-3 space-y-2">
                        {syncPreview.archives.length === 0 ? (
                          <p className="text-sm text-zinc-500">
                            No website-only products found.
                          </p>
                        ) : (
                          syncPreview.archives.slice(0, 8).map((item) => (
                            <div
                              key={item.websiteProductId}
                              className="rounded border border-zinc-800/70 bg-zinc-900/70 p-2"
                            >
                              <div className="text-sm font-medium text-zinc-100">
                                {item.title}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                SKU: {item.skuSample || "N/A"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                      <h3 className="text-sm font-semibold text-white">Conflicts</h3>
                      <div className="mt-3 space-y-2">
                        {syncPreview.conflicts.length === 0 ? (
                          <p className="text-sm text-zinc-500">
                            No ambiguous SKU matches.
                          </p>
                        ) : (
                          syncPreview.conflicts.slice(0, 8).map((item) => (
                            <div
                              key={item.remoteProductId}
                              className="rounded border border-red-900/40 bg-zinc-900/70 p-2"
                            >
                              <div className="text-sm font-medium text-zinc-100">
                                {item.title}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                SKU: {item.skuMatches.join(", ") || "N/A"}
                              </div>
                              <div className="mt-1 text-xs text-red-300">
                                Multiple website candidates:{" "}
                                {item.candidateWebsiteProductIds.length}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-300">Loading preview...</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-4">
              <p className="text-xs text-zinc-500">
                This sync only changes website inventory. It imports missing Lightspeed
                products and archives website-only products.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSyncDialogOpen(false);
                    setSyncModalStage("preview_summary");
                    setSyncPreview(null);
                    setPreviewScanState(null);
                    setSyncProgress(null);
                  }}
                  className="rounded border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
                  disabled={
                    syncLoading &&
                    syncModalStage !== "preview_summary" &&
                    syncProgress?.phase !== "complete" &&
                    syncProgress?.phase !== "error" &&
                    previewScanState?.status !== "error"
                  }
                >
                  {syncModalStage === "preview_summary" ? "Cancel" : "Close"}
                </button>
                {syncModalStage === "preview_summary" && !syncProgress && (
                  <button
                    type="button"
                    onClick={() => {
                      void applySync();
                    }}
                    className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={syncLoading || !syncPreview}
                  >
                    {syncLoading ? "Applying..." : "Apply Sync"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
