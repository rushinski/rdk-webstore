// src/components/store/StoreControls.tsx
// OPTIMIZED VERSION - Memoization and performance improvements
"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { RdkSelect } from "@/components/ui/Select";

interface StoreControlsProps {
  total: number;
  page: number;
  pageCount: number;
  limit: number;
  sort: string;
  showSortControls?: boolean;
  showPagination?: boolean;
}

const PAGE_SIZE_OPTIONS = [20, 40, 60, 100];
const MAX_PAGE_BUTTONS = 5;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Title: A-Z" },
  { value: "name_desc", label: "Title: Z-A" },
];

export function StoreControls({
  total,
  page,
  pageCount,
  limit,
  sort,
  showSortControls = true,
  showPagination = true,
}: StoreControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // OPTIMIZATION 1: Use useTransition for smoother page transitions
  const [isPending, startTransition] = useTransition();

  // OPTIMIZATION 2: Memoize calculations
  const showingStart = useMemo(
    () => (total === 0 ? 0 : (page - 1) * limit + 1),
    [total, page, limit]
  );
  
  const showingEnd = useMemo(
    () => (total === 0 ? 0 : Math.min(page * limit, total)),
    [total, page, limit]
  );

  const pageNumbers = useMemo(() => {
    if (pageCount <= 1) {
      return [1];
    }

    const half = Math.floor(MAX_PAGE_BUTTONS / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(pageCount, start + MAX_PAGE_BUTTONS - 1);

    if (end - start < MAX_PAGE_BUTTONS - 1) {
      start = Math.max(1, end - MAX_PAGE_BUTTONS + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [page, pageCount]);

  // OPTIMIZATION 3: Memoize page size options
  const pageSizeOptions = useMemo(
    () => PAGE_SIZE_OPTIONS.map((size) => ({
      value: String(size),
      label: String(size),
    })),
    []
  );

  // OPTIMIZATION 4: Use useCallback for event handlers
  const updateParams = useCallback(
    (updates: Partial<{ page: number; limit: number; sort: string }>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.sort) {
        params.set("sort", updates.sort);
      }
      if (typeof updates.limit === "number") {
        params.set("limit", String(updates.limit));
      }
      if (typeof updates.page === "number") {
        params.set("page", String(updates.page));
      }

      startTransition(() => {
        router.push(`/store?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      updateParams({ sort: value, page: 1 });
    },
    [updateParams]
  );

  const handleLimitChange = useCallback(
    (value: number) => {
      updateParams({ limit: value, page: 1 });
    },
    [updateParams]
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > pageCount || nextPage === page) {
        return;
      }
      updateParams({ page: nextPage });
    },
    [page, pageCount, updateParams]
  );

  return (
    <div className={`mb-6 space-y-4 ${isPending ? 'opacity-60' : ''}`}>
      {showSortControls && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-gray-400 text-[12px] sm:text-sm">
            {total === 0
              ? "No products found"
              : `Showing ${showingStart}-${showingEnd} of ${total}`}
          </div>
          <div className="flex items-center gap-1.5 flex-nowrap">
            <label className="text-gray-400 text-[11px] sm:text-sm whitespace-nowrap leading-none">
              Sort by:
            </label>
            <RdkSelect
              value={sort}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
              className="w-[110px] sm:min-w-[160px]"
              buttonClassName="h-7 px-2 text-[11px] sm:text-sm"
              menuClassName="text-[11px] sm:text-sm"
            />
            <label className="text-gray-400 text-[11px] sm:text-sm whitespace-nowrap leading-none">
              Per page:
            </label>
            <RdkSelect
              value={String(limit)}
              onChange={(value) => handleLimitChange(Number(value))}
              options={pageSizeOptions}
              className="w-[72px] sm:min-w-[90px]"
              buttonClassName="h-7 px-1.5 text-[11px] sm:text-sm gap-1"
              menuClassName="text-[11px] sm:text-sm"
            />
          </div>
        </div>
      )}

      {showPagination && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Controls row */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Prev */}
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isPending}
              className="inline-flex items-center gap-1 border border-zinc-800/70 px-2.5 py-2 text-xs text-zinc-300 hover:text-white hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page numbers (scrolls on mobile instead of overflowing) */}
            <div
              className="flex-1 min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Pagination pages"
            >
              <div className="flex items-center gap-1 w-max px-0.5">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    disabled={isPending}
                    aria-current={pageNumber === page ? "page" : undefined}
                    aria-label={`Page ${pageNumber}`}
                    className={`h-8 w-8 sm:h-9 sm:w-9 text-xs border transition shrink-0 ${
                      pageNumber === page
                        ? "border-red-500 text-white"
                        : "border-zinc-800/70 text-zinc-300 hover:text-white hover:border-red-600/40"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Next */}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount || isPending}
              className="inline-flex items-center gap-1 border border-zinc-800/70 px-2.5 py-2 text-xs text-zinc-300 hover:text-white hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page count label (never forces overflow on mobile) */}
          <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-zinc-500">
            Page {page} of {pageCount}
          </div>
        </div>
      )}
      
      {/* OPTIMIZATION 5: Show loading indicator */}
      {isPending && (
        <div className="text-xs text-gray-500 text-center">
          Loading...
        </div>
      )}
    </div>
  );
}