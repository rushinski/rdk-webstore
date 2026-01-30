// app/store/page.tsx
// FIXED VERSION - Removed duplicate product count, proper filter behavior

import Link from "next/link";
import { Suspense } from "react";

import { FilterPanel } from "@/components/store/FilterPanel";
import { InfiniteProductGrid } from "@/components/store/InfiniteProductGrid";
import { StoreControls } from "@/components/store/StoreControls";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { StorefrontService } from "@/services/storefront-service";
import { storeProductsQuerySchema } from "@/lib/validation/storefront";
import type { ProductFilters } from "@/repositories/product-repo";

export const revalidate = 60;

const getArrayParam = (
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }
  return [];
};

const getStringParam = (
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden animate-pulse"
        >
          <div className="aspect-square bg-zinc-800" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-6 bg-zinc-800 rounded w-1/3 mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function StoreContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | undefined;
}) {
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
    limit: Number.isFinite(limitValue) ? limitValue : 12,
  };

  const parsed = storeProductsQuerySchema.safeParse(rawFilters);
  const filters: ProductFilters = parsed.success
    ? parsed.data
    : {
        ...rawFilters,
        sort: "newest",
        page: 1,
        limit: 12,
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

  const supabase = createSupabasePublicClient();
  const service = new StorefrontService(supabase);

  const [productsResult, filterData] = await Promise.all([
    service.listProducts(filters),
    service.listFilters({ filters }),
  ]);

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

  const breadcrumbItems = (() => {
    const formatLabel = (value: string) =>
      value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());

    const items: Array<{ label: string; href?: string }> = [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/store" },
    ];

    if (query) {
      items.push({ label: `Search: ${query}` });
      return items;
    }

    if (selectedCategories.length === 1) {
      items.push({ label: formatLabel(selectedCategories[0]) });
      return items;
    }

    if (selectedBrands.length === 1) {
      items.push({ label: selectedBrands[0] });
      return items;
    }

    if (selectedModels.length === 1) {
      items.push({ label: selectedModels[0] });
      return items;
    }

    const hasFilters =
      selectedCategories.length > 0 ||
      selectedBrands.length > 0 ||
      selectedModels.length > 0 ||
      selectedShoeSizes.length > 0 ||
      selectedClothingSizes.length > 0 ||
      selectedConditions.length > 0;

    if (hasFilters) {
      items.push({ label: "Filtered" });
    }

    return items;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-zinc-300" : ""}>{item.label}</span>
                )}
                {!isLast && <span className="text-zinc-700">/</span>}
              </div>
            );
          })}
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">
          {query ? `Search: "${query}"` : "Shop All"}
        </h1>
        {/* REMOVED: Duplicate product count - it's now in the filter panel */}
      </div>

      {/* Sort controls only */}
      <StoreControls
        total={productsResult.total}
        sort={filters.sort ?? "newest"}
        showSortControls={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filter Panel */}
        <div className="hidden lg:block">
          <div
            className="sticky transition-[top] duration-300"
            style={{ top: "var(--rdk-header-offset, 0px)" }}
          >
            <FilterPanel
              selectedCategories={selectedCategories}
              selectedBrands={selectedBrands}
              selectedModels={selectedModels}
              selectedShoeSizes={selectedShoeSizes}
              selectedClothingSizes={selectedClothingSizes}
              selectedConditions={selectedConditions}
              categories={filterData.categories}
              brands={brandOptions}
              modelsByBrand={filterData.modelsByBrand}
              brandsByCategory={filterData.brandsByCategory}
              availableShoeSizes={filterData.availableShoeSizes}
              availableClothingSizes={filterData.availableClothingSizes}
              availableConditions={filterData.availableConditions}
              totalProducts={productsResult.total}
            />
          </div>
        </div>

        {/* Infinite Scroll Product Grid */}
        <div className="lg:col-span-3">
          <InfiniteProductGrid
            initialProducts={productsResult.products}
            total={productsResult.total}
            initialPage={productsResult.page}
            limit={productsResult.limit}
            storeHref={storeHref}
          />
        </div>
      </div>

      {/* Mobile Filter Panel */}
      <div className="lg:hidden">
        <FilterPanel
          selectedCategories={selectedCategories}
          selectedBrands={selectedBrands}
          selectedModels={selectedModels}
          selectedShoeSizes={selectedShoeSizes}
          selectedClothingSizes={selectedClothingSizes}
          selectedConditions={selectedConditions}
          categories={filterData.categories}
          brands={brandOptions}
          modelsByBrand={filterData.modelsByBrand}
          brandsByCategory={filterData.brandsByCategory}
          availableShoeSizes={filterData.availableShoeSizes}
          availableClothingSizes={filterData.availableClothingSizes}
          availableConditions={filterData.availableConditions}
          totalProducts={productsResult.total}
        />
      </div>
    </div>
  );
}

export default async function StorePage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<LoadingGrid />}>
      <StoreContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}