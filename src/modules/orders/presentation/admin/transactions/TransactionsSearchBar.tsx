"use client";

import { Search } from "lucide-react";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

type TransactionsSearchBarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function TransactionsSearchBar({
  searchQuery,
  onSearchQueryChange,
}: TransactionsSearchBarProps) {
  return (
    <div className="flex max-w-md items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2">
      <Search className="h-4 w-4 text-brand-muted" />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search by date, customer, fulfillment, or order ID"
        className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
      />
    </div>
  );
}
