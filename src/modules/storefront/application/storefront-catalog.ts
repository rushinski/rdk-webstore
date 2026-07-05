import { storeProductsQuerySchema } from "@/lib/validation/storefront";
import { createStorefrontService } from "@/modules/storefront/infrastructure/storefront-data";

export type StoreSearchParams = Record<string, string | string[] | undefined> | undefined;
export type StorefrontCatalogFilters = {
  q?: string;
  category?: string[];
  brand?: string[];
  model?: string[];
  sizeShoe?: string[];
  sizeClothing?: string[];
  condition?: string[];
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc";
  page?: number;
  limit?: number;
  includeOutOfStock?: boolean;
};

const getArrayParam = (searchParams: StoreSearchParams, key: string) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }
  return [];
};

const getStringParam = (searchParams: StoreSearchParams, key: string) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

export async function getStoreCatalogPageData(searchParams: StoreSearchParams) {
  const qParam = getStringParam(searchParams, "q");
  const sortParam = getStringParam(searchParams, "sort");
  const pageParam = getStringParam(searchParams, "page");
  const limitParam = getStringParam(searchParams, "limit");

  const pageValue = Number.parseInt(pageParam ?? "", 10);
  const limitValue = Number.parseInt(limitParam ?? "", 10);

  const rawFilters = {
    q: qParam && qParam.trim().length > 0 ? qParam : undefined,
    category: getArrayParam(searchParams, "category"),
    brand: getArrayParam(searchParams, "brand"),
    model: getArrayParam(searchParams, "model"),
    sizeShoe: getArrayParam(searchParams, "sizeShoe"),
    sizeClothing: getArrayParam(searchParams, "sizeClothing"),
    condition: getArrayParam(searchParams, "condition"),
    sort: sortParam && sortParam.trim().length > 0 ? sortParam : "newest",
    page: Number.isFinite(pageValue) ? pageValue : 1,
    limit: Number.isFinite(limitValue) ? limitValue : 20,
  };

  const parsed = storeProductsQuerySchema.safeParse(rawFilters);
  const filters: StorefrontCatalogFilters = parsed.success
    ? parsed.data
    : {
        ...rawFilters,
        sort: "newest",
        page: 1,
        limit: 20,
        includeOutOfStock: false,
      };

  const storeQueryParams = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (!value || key === "from") {
        return;
      }
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((entry) => storeQueryParams.append(key, entry));
        return;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        storeQueryParams.append(key, value);
      }
    });
  }
  const storeHref = storeQueryParams.toString()
    ? `/store?${storeQueryParams.toString()}`
    : "/store";

  const service = createStorefrontService();
  const [productsResult, filterData] = await Promise.all([
    service.listProducts(filters),
    service.listFilters({ filters }),
  ]);

  const pageCount = Math.max(1, Math.ceil(productsResult.total / productsResult.limit));
  const brandOptions = filterData.brands.map((brand) => ({
    value: brand.label,
    label: brand.label,
  }));

  const selectedCategories = filters.category ?? [];
  const selectedBrands = filters.brand ?? [];
  const selectedModels = filters.model ?? [];
  const selectedShoeSizes = filters.sizeShoe ?? [];
  const selectedClothingSizes = filters.sizeClothing ?? [];
  const selectedConditions = filters.condition ?? [];
  const query = filters.q ?? "";

  const formatLabel = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());

  const activeFilterLabels = Array.from(
    new Set([
      ...selectedCategories.map(formatLabel),
      ...selectedBrands,
      ...selectedModels,
      ...selectedShoeSizes,
      ...selectedClothingSizes,
      ...selectedConditions.map(formatLabel),
    ]),
  );

  const browseLabel = (() => {
    if (query) {
      return `Search: "${query}"`;
    }
    if (activeFilterLabels.length === 0) {
      return "Shop All";
    }
    if (activeFilterLabels.length === 1) {
      return activeFilterLabels[0];
    }
    return "Multiple Categories";
  })();

  return {
    brandOptions,
    browseLabel,
    filterData,
    filters,
    pageCount,
    productsResult,
    selectedBrands,
    selectedCategories,
    selectedClothingSizes,
    selectedConditions,
    selectedModels,
    selectedShoeSizes,
    storeHref,
  };
}
