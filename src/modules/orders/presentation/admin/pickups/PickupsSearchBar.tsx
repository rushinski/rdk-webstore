"use client";

import { Search } from "lucide-react";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

type PickupsSearchBarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function PickupsSearchBar({
  searchQuery,
  onSearchQueryChange,
}: PickupsSearchBarProps) {
  return (
    <div className="flex max-w-md items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2">
      <Search className="h-4 w-4 text-brand-muted" />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search by date, customer, email, or order"
        className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
      />
    </div>
  );
}
