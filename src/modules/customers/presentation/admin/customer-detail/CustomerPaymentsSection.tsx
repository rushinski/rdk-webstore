"use client";

import { useRouter } from "next/navigation";

import type { CustomerPayment } from "@/modules/customers/presentation/admin/customer-detail/useAdminCustomerDetailData";
import {
  formatCustomerDate,
  formatCustomerMoney,
} from "@/modules/customers/presentation/admin/customer-detail/customerDetailView";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type CustomerPaymentsSectionProps = {
  payments: CustomerPayment[];
};

export function CustomerPaymentsSection({ payments }: CustomerPaymentsSectionProps) {
  const router = useRouter();

  return (
    <AdminSectionCard title="Payments">
      {payments.length === 0 ? (
        <AdminEmptyState
          title="No Payments Recorded"
          description="There are no payment records attached to this customer yet."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-border bg-brand-page text-xs uppercase tracking-[0.18em] text-brand-muted">
              <tr>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Order</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  onClick={() => router.push(`/admin/transactions/${payment.orderId}`)}
                  className="cursor-pointer border-b border-brand-border transition hover:bg-brand-page"
                >
                  <td className="p-3 text-brand-text">
                    {formatCustomerMoney(payment.amount)}
                  </td>
                  <td className="p-3 text-brand-text">{payment.status}</td>
                  <td className="p-3 text-brand-muted">
                    {formatCustomerDate(payment.createdAt)}
                  </td>
                  <td className="p-3 font-mono text-xs text-brand-text">
                    #{payment.orderId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSectionCard>
  );
}
