// app/store/page.tsx

import Link from "next/link";
import { unstable_cache } from "next/cache";
import { FilterPanel } from "@/components/store/FilterPanel";
import { ProductGrid } from "@/components/store/ProductGrid";
import { StoreControls } from "@/components/store/StoreControls";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { StorefrontService } from "@/services/storefront-service";
import { storeProductsQuerySchema } from "@/lib/validation/storefront";
import type { ProductFilters } from "@/repositories/product-repo";

const PRODUCTS_REVALIDATE_SECONDS = 60;
export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

const listProductsCached = unstable_cache(
  async (filters: ProductFilters) => {
    const supabase = createSupabasePublicClient();
    const service = new StorefrontService(supabase);
    return service.listProducts(filters);
  },
  ["storefront", "products"],
  { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: ["products:list"] }
);

const listFiltersCached = unstable_cache(
  async () => {
    const supabase = createSupabasePublicClient();
    const service = new StorefrontService(supabase);
    return service.listFilters();
  },
  ["storefront", "filters"],
  { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: ["products:list"] }
);

const getArrayParam = (
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim().length > 0) return [value];
  return [];
};

const getStringParam = (
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
};

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const qParam = getStringParam(resolvedSearchParams, "q");
  const sortParam = getStringParam(resolvedSearchParams, "sort");
  const pageParam = getStringParam(resolvedSearchParams, "page");
  const limitParam = getStringParam(resolvedSearchParams, "limit");

  const pageValue = Number.parseInt(pageParam ?? "", 10);
  const limitValue = Number.parseInt(limitParam ?? "", 10);

  const rawFilters = {
    q: qParam && qParam.trim().length > 0 ? qParam : undefined,
    category: getArrayParam(resolvedSearchParams, "category"),
    brand: getArrayParam(resolvedSearchParams, "brand"),
    model: getArrayParam(resolvedSearchParams, "model"),
    sizeShoe: getArrayParam(resolvedSearchParams, "sizeShoe"),
    sizeClothing: getArrayParam(resolvedSearchParams, "sizeClothing"),
    condition: getArrayParam(resolvedSearchParams, "condition"),
    sort: sortParam && sortParam.trim().length > 0 ? sortParam : "newest",
    page: Number.isFinite(pageValue) ? pageValue : 1,
    limit: Number.isFinite(limitValue) ? limitValue : 20,
  };

  const parsed = storeProductsQuerySchema.safeParse(rawFilters);
  const filters: ProductFilters = parsed.success
    ? parsed.data
    : {
        ...rawFilters,
        sort: "newest",
        page: 1,
        limit: 20,
      };

  let productsResult = await listProductsCached(filters);
  let pageCount = Math.max(1, Math.ceil(productsResult.total / productsResult.limit));

  if (productsResult.total > 0 && productsResult.page > pageCount) {
    const adjustedFilters = { ...filters, page: pageCount };
    productsResult = await listProductsCached(adjustedFilters);
    pageCount = Math.max(1, Math.ceil(productsResult.total / productsResult.limit));
  }

  const filterData = await listFiltersCached();
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
      value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (match) => match.toUpperCase());

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
        <p className="text-gray-400">{productsResult.total} products</p>
      </div>

      <StoreControls
        total={productsResult.total}
        page={productsResult.page}
        pageCount={pageCount}
        limit={productsResult.limit}
        sort={filters.sort ?? "newest"}
        showPagination={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="hidden lg:block">
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
          />
        </div>

        <div className="lg:col-span-3">
          <ProductGrid products={productsResult.products} />
        </div>
      </div>

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
        />
      </div>

      <div className="mt-10">
        <StoreControls
          total={productsResult.total}
          page={productsResult.page}
          pageCount={pageCount}
          limit={productsResult.limit}
          sort={filters.sort ?? "newest"}
          showSortControls={false}
        />
      </div>
    </div>
  );
}
