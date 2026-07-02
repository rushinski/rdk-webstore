"use client";

import { useRouter } from "next/navigation";

import { buildTransactionRowModel } from "@/components/admin/transactions/transactionsView";
import type { TransactionOrder } from "@/components/admin/transactions/useAdminTransactionsData";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

type TransactionsTableProps = {
  isLoading: boolean;
  orders: TransactionOrder[];
};

const tableHeaderCellStyles =
  "bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

export function TransactionsTable({ isLoading, orders }: TransactionsTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden border border-brand-border bg-brand-surface">
      {isLoading ? (
        <AdminEmptyState
          title="Loading Transactions"
          description="Fetching payment activity."
        />
      ) : orders.length === 0 ? (
        <AdminEmptyState title="No Transactions Found" />
      ) : (
        <table className="w-full text-[12px] sm:text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-page">
              <th className={tableHeaderCellStyles}>Placed At</th>
              <th className={tableHeaderCellStyles}>Order</th>
              <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Status</th>
              <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                Customer
              </th>
              <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Payment</th>
              <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                Fulfillment
              </th>
              <th className={`${tableHeaderCellStyles} text-right`}>Amount</th>
              <th className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}>
                Profit
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
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
                      <span className={profit >= 0 ? "text-emerald-700" : "text-red-700"}>
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
  );
}
