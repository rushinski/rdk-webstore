// src/components/admin/transactions/AdminTransactionsScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  buildFilteredTransactions,
  buildPaginationWindow,
  buildTransactionRowModel,
} from "@/components/admin/transactions/transactionsView";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import {
  TRANSACTION_TABS,
  useAdminTransactionsData,
} from "@/components/admin/transactions/useAdminTransactionsData";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";
const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";
const tabButtonBase =
  "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors";
const tabActiveStyles = "border-brand-text text-brand-text";
const tabInactiveStyles = "border-transparent text-brand-muted hover:text-brand-text";
const tabCountStyles =
  "border border-brand-border bg-brand-page px-2 py-0.5 text-[11px] text-brand-text";
const tableHeaderCellStyles =
  "bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

export function AdminTransactionsScreen() {
  const router = useRouter();
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

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }
    const { end, pages, start } = buildPaginationWindow(page, totalPages);

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={paginationButtonStyles}
        >
          Previous
        </button>
        {start > 1 && (
          <button
            type="button"
            onClick={() => setPage(1)}
            className={paginationButtonStyles}
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-brand-muted">...</span>}
        {pages.map((nextPage) => (
          <button
            key={nextPage}
            type="button"
            onClick={() => setPage(nextPage)}
            className={
              nextPage === page ? paginationCurrentStyles : paginationButtonStyles
            }
          >
            {nextPage}
          </button>
        ))}
        {end < totalPages - 1 && <span className="text-brand-muted">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            className={paginationButtonStyles}
          >
            {totalPages}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={paginationButtonStyles}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Transactions" description="All payment activity" />

      <div className="flex flex-wrap gap-6 border-b border-brand-border">
        {TRANSACTION_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`${tabButtonBase} ${activeTab === tab.key ? tabActiveStyles : tabInactiveStyles}`}
          >
            {tab.label}
            <span className={tabCountStyles}>
              {counts[tab.key] > 99 ? "99+" : counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex max-w-md items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2">
        <Search className="h-4 w-4 text-brand-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by date, customer, fulfillment, or order ID"
          className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted`}
        />
      </div>

      <AdminSectionCard>
        <div className="overflow-hidden border border-brand-border bg-brand-surface">
          {isLoading ? (
            <AdminEmptyState
              title="Loading Transactions"
              description="Fetching payment activity."
            />
          ) : filteredOrders.length === 0 ? (
            <AdminEmptyState title="No Transactions Found" />
          ) : (
            <table className="w-full text-[12px] sm:text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-page">
                  <th className={tableHeaderCellStyles}>Placed At</th>
                  <th className={tableHeaderCellStyles}>Order</th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Status
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Customer
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Payment
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Fulfillment
                  </th>
                  <th className={`${tableHeaderCellStyles} text-right`}>Amount</th>
                  <th
                    className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}
                  >
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const {
                    createdAt,
                    customerName,
                    fulfillmentLabel,
                    orderHref,
                    paymentDisplay,
                    profit,
                    statusMeta,
                  } = buildTransactionRowModel(order);

                  return (
                    <tr
                      key={order.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`View transaction ${order.id}`}
                      onClick={() => router.push(orderHref)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(orderHref);
                        }
                      }}
                      className="cursor-pointer border-b border-brand-border transition-colors hover:bg-brand-page focus-visible:bg-brand-page focus-visible:outline-none"
                    >
                      <td className="p-3 text-brand-muted sm:p-4">
                        {createdAt ? (
                          <div className="space-y-0.5">
                            <div>{createdAt.toLocaleDateString()}</div>
                            <div className="text-xs text-brand-muted">
                              {createdAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-brand-text sm:p-4">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="hidden p-3 sm:p-4 md:table-cell">
                        <AdminStatusBadge tone={statusMeta.tone}>
                          {statusMeta.label}
                        </AdminStatusBadge>
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {customerName}
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {paymentDisplay}
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {fulfillmentLabel}
                      </td>
                      <td className="p-3 text-right text-brand-text sm:p-4">
                        ${Number(order.total ?? 0).toFixed(2)}
                      </td>
                      <td className="hidden p-3 text-right sm:p-4 md:table-cell">
                        {profit === null ? (
                          <span className="text-brand-muted">-</span>
                        ) : (
                          <span
                            className={profit >= 0 ? "text-emerald-700" : "text-red-700"}
                          >
                            {profit >= 0 ? "+" : ""}${Math.abs(profit).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </AdminSectionCard>

      {!isLoading && totalPages > 1 ? <div>{renderPagination()}</div> : null}
    </div>
  );
}
