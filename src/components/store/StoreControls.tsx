// src/components/store/StoreControls.tsx
"use client";

import { useMemo } from "react";
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

  const showingStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = total === 0 ? 0 : Math.min(page * limit, total);

  const pageNumbers = useMemo(() => {
    if (pageCount <= 1) return [1];

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

  const updateParams = (updates: Partial<{ page: number; limit: number; sort: string }>) => {
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

    router.push(`/store?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    updateParams({ sort: value, page: 1 });
  };

  const handleLimitChange = (value: number) => {
    updateParams({ limit: value, page: 1 });
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) return;
    updateParams({ page: nextPage });
  };

  return (
    <div className="mb-6 space-y-4">
      {showSortControls && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-gray-400 text-[12px] sm:text-sm">
            {total === 0 ? "No products found" : `Showing ${showingStart}-${showingEnd} of ${total}`}
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
              options={PAGE_SIZE_OPTIONS.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              className="w-[72px] sm:min-w-[90px]"
              buttonClassName="h-7 px-1.5 text-[11px] sm:text-sm gap-1"
              menuClassName="text-[11px] sm:text-sm"
            />
          </div>
        </div>
      )}

      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 border border-zinc-800/70 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => goToPage(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
                className={`h-9 w-9 text-xs border transition ${
                  pageNumber === page
                    ? "border-red-500 text-white"
                    : "border-zinc-800/70 text-zinc-300 hover:text-white hover:border-red-600/40"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount}
              className="inline-flex items-center gap-1 border border-zinc-800/70 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Page {page} of {pageCount}
          </div>
        </div>
      )}
    </div>
  );
}
