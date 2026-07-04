import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import type { SalesLog } from "@/modules/nexus/presentation/admin/stateDetailTypes";

type StateSalesHistorySectionProps = {
  formatCurrency: (value: number) => string;
  formatDate: (value: string) => string;
  hasCheckedSales: boolean;
  hasSales: boolean;
  loadingSalesLog: boolean;
  onSalesLogPageChange: (page: number) => void;
  onViewSalesLog: () => void;
  salesLog: SalesLog[];
  salesLogPage: number;
  salesLogTotal: number;
};

export function StateSalesHistorySection({
  formatCurrency,
  formatDate,
  hasCheckedSales,
  hasSales,
  loadingSalesLog,
  onSalesLogPageChange,
  onViewSalesLog,
  salesLog,
  salesLogPage,
  salesLogTotal,
}: StateSalesHistorySectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-brand-text">Sales History</h3>
        {salesLog.length === 0 && (
          <button
            onClick={onViewSalesLog}
            disabled={!hasSales || loadingSalesLog}
            className={[
              adminButtonStyles.secondary,
              !hasSales ? "cursor-not-allowed opacity-40" : "",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
            title={!hasSales ? "No sales in this state yet" : "View all sales"}
          >
            {loadingSalesLog
              ? "Loading..."
              : !hasSales
                ? "No Sales Yet"
                : "View All Sales"}
          </button>
        )}
      </div>

      {!hasSales && !hasCheckedSales && (
        <AdminSectionCard>
          <div className="text-center text-brand-muted">
            No sales recorded for this state yet
          </div>
        </AdminSectionCard>
      )}

      {salesLog.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-hidden border border-brand-border">
            <table className="w-full text-sm">
              <thead className="bg-brand-page">
                <tr>
                  <th className="px-4 py-2 text-left text-brand-text">Date</th>
                  <th className="px-4 py-2 text-left text-brand-text">Order ID</th>
                  <th className="px-4 py-2 text-right text-brand-text">Total</th>
                  <th className="px-4 py-2 text-right text-brand-text">Tax</th>
                  <th className="px-4 py-2 text-left text-brand-text">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {salesLog.map((sale) => (
                  <tr key={sale.order_id} className="hover:bg-brand-page">
                    <td className="px-4 py-2 text-brand-muted">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-brand-muted">
                      {sale.order_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-right text-brand-text">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-700">
                      {formatCurrency(sale.tax_amount)}
                    </td>
                    <td className="px-4 py-2 capitalize text-brand-muted">
                      {sale.fulfillment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-brand-muted">
              Showing {salesLogPage * 10 + 1} to{" "}
              {Math.min((salesLogPage + 1) * 10, salesLogTotal)} of {salesLogTotal} sales
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onSalesLogPageChange(salesLogPage - 1)}
                disabled={salesLogPage === 0 || loadingSalesLog}
                className={`${adminButtonStyles.secondary} disabled:opacity-50`}
              >
                Previous
              </button>
              <button
                onClick={() => onSalesLogPageChange(salesLogPage + 1)}
                disabled={(salesLogPage + 1) * 10 >= salesLogTotal || loadingSalesLog}
                className={`${adminButtonStyles.secondary} disabled:opacity-50`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
