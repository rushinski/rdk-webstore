import type { Category, Condition, ProductWithDetails } from "@/types/domain/product";

export type StockStatus = "in_stock" | "archived";
type BulkStockStatus = StockStatus | "all";

export type InventoryFilters = {
  q?: string;
  category?: Category | "all";
  condition?: Condition | "all";
  stockStatus?: StockStatus;
  page?: number;
};

type InventoryLiveState = {
  isLive: boolean;
  label: string;
  detail: string | null;
  detailTooltip: string | null;
};

type InventoryDateFormatters = {
  dateFormatter?: Intl.DateTimeFormat;
  dateWithYearFormatter?: Intl.DateTimeFormat;
  timeFormatter?: Intl.DateTimeFormat;
};

type BuildInventoryBulkActionRequestArgs =
  | {
      action: "archive" | "delete" | "restore";
      selectionMode: "ids";
      ids: string[];
    }
  | {
      action: "archive" | "delete" | "restore";
      selectionMode: "filtered";
      filters: {
        q?: string;
        category?: Category | "all";
        condition?: Condition | "all";
        stockStatus?: BulkStockStatus;
      };
    };

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

export function buildInventoryPageSearchParams(
  filters: InventoryFilters,
): URLSearchParams {
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

  return params;
}

export function buildInventoryFetchSearchParams({
  pageSize,
  filters,
}: {
  pageSize: number;
  filters: InventoryFilters;
}): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(pageSize),
    page: String(filters.page ?? 1),
    includeOutOfStock: "1",
    searchMode: "inventory",
  });

  if (filters.q?.trim()) {
    params.set("q", filters.q.trim());
  }
  if (filters.category && filters.category !== "all") {
    params.append("category", filters.category);
  }
  if (filters.condition && filters.condition !== "all") {
    params.append("condition", filters.condition);
  }
  if (filters.stockStatus) {
    params.set("stockStatus", filters.stockStatus);
  }

  return params;
}

export function buildInventoryExportSearchParams(
  filters: Omit<InventoryFilters, "page">,
): URLSearchParams {
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
  if (filters.stockStatus) {
    params.set("stockStatus", filters.stockStatus);
  }

  return params;
}

export function buildInventoryBulkActionRequest(
  args: BuildInventoryBulkActionRequestArgs,
) {
  if (args.selectionMode === "ids") {
    return args;
  }

  return {
    action: args.action,
    selectionMode: "filtered" as const,
    filters: {
      q: args.filters.q || undefined,
      category:
        args.filters.category && args.filters.category !== "all"
          ? [args.filters.category]
          : undefined,
      condition:
        args.filters.condition && args.filters.condition !== "all"
          ? [args.filters.condition]
          : undefined,
      stockStatus:
        args.action === "archive" && args.filters.stockStatus === "archived"
          ? "all"
          : args.filters.stockStatus,
    },
  };
}

export function getProductRawTitle(product: ProductWithDetails): string {
  return product.name?.trim() || "Item";
}

export function getPrimaryImageUrl(product: ProductWithDetails): string | null {
  const primary =
    product.images.find((image) => image.is_primary) ?? product.images[0] ?? null;
  return primary?.url ?? null;
}

export function getProductTotalStock(product: ProductWithDetails): number {
  return product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
}

export function getProductLiveState(
  product: ProductWithDetails,
  {
    now = Date.now(),
    dateFormatter = LIVE_DATE_FORMATTER,
    dateWithYearFormatter = LIVE_DATE_WITH_YEAR_FORMATTER,
    timeFormatter = LIVE_TIME_FORMATTER,
  }: { now?: number } & InventoryDateFormatters = {},
): InventoryLiveState {
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

  const parsed = product.go_live_at ? Date.parse(product.go_live_at) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= now) {
    return {
      isLive: true,
      label: "Live",
      detail: null,
      detailTooltip: null,
    };
  }

  const scheduledAt = new Date(parsed);
  const includeYear = scheduledAt.getFullYear() !== new Date(now).getFullYear();
  const dateText = includeYear
    ? dateWithYearFormatter.format(scheduledAt)
    : dateFormatter.format(scheduledAt);
  const timeText = timeFormatter.format(scheduledAt);

  return {
    isLive: false,
    label: "Scheduled",
    detail: `${dateText} | ${timeText}`,
    detailTooltip: `${dateText}, ${timeText}`,
  };
}
