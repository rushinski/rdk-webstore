// src/components/store/StoreControls.tsx
// FIXED VERSION - No product count (moved to filter panel), just sort
"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RdkSelect } from "@/components/ui/Select";

interface StoreControlsProps {
  total: number;
  sort: string;
  showSortControls?: boolean;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Title: A-Z" },
  { value: "name_desc", label: "Title: Z-A" },
];

export function StoreControls({
  total,
  sort,
  showSortControls = true,
}: StoreControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: { sort: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", updates.sort);
      params.set("page", "1"); // Reset to page 1 on sort change
      router.push(`/store?${params.toString()}`, { scroll: true });
    },
    [router, searchParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      updateParams({ sort: value });
    },
    [updateParams]
  );

  if (!showSortControls || total === 0) {
    return null;
  }

  return (
    <div className="mb-6 flex justify-end">
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
      </div>
    </div>
  );
}