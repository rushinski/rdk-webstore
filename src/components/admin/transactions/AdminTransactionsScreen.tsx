// src/components/admin/transactions/AdminTransactionsScreen.tsx
"use client";

import { useMemo, useState } from "react";

import { buildFilteredTransactions } from "@/components/admin/transactions/transactionsView";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { useAdminTransactionsData } from "@/components/admin/transactions/useAdminTransactionsData";
import { TransactionsPagination } from "@/components/admin/transactions/TransactionsPagination";
import { TransactionsSearchBar } from "@/components/admin/transactions/TransactionsSearchBar";
import { TransactionsTabBar } from "@/components/admin/transactions/TransactionsTabBar";
import { TransactionsTable } from "@/components/admin/transactions/TransactionsTable";

export function AdminTransactionsScreen() {
  const {
    activeTab,
    counts,
    isLoading,
    orders,
    page,
    setActiveTab,
    setPage,
    totalPages,
  } = useAdminTransactionsData();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(
    () => buildFilteredTransactions(orders, searchQuery),
    [orders, searchQuery],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Transactions" description="All payment activity" />

      <TransactionsTabBar
        activeTab={activeTab}
        counts={counts}
        onTabChange={setActiveTab}
      />

      <TransactionsSearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <AdminSectionCard>
        <TransactionsTable isLoading={isLoading} orders={filteredOrders} />
      </AdminSectionCard>

      {!isLoading && totalPages > 1 ? (
        <TransactionsPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
