"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react";

import { CustomerDetailRow } from "@/modules/customers/presentation/admin/customer-detail/CustomerDetailRow";
import {
  buildPaymentMethodDetailRows,
  formatCustomerDate,
} from "@/modules/customers/presentation/admin/customer-detail/customerDetailView";
import type { CustomerPaymentMethod } from "@/modules/customers/presentation/admin/customer-detail/useAdminCustomerDetailData";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type CustomerPaymentMethodsSectionProps = {
  paymentMethods: CustomerPaymentMethod[];
};

export function CustomerPaymentMethodsSection({
  paymentMethods,
}: CustomerPaymentMethodsSectionProps) {
  const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({});

  return (
    <AdminSectionCard title="Payment Methods">
      {paymentMethods.length === 0 ? (
        <AdminEmptyState
          title="No Payment Methods"
          description="No reusable payment-method history is available for this customer yet."
        />
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const isExpanded = expandedMethods[method.id] ?? false;

            return (
              <div
                key={method.id}
                className="overflow-hidden border border-brand-border bg-brand-page"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedMethods((current) => ({
                      ...current,
                      [method.id]: !isExpanded,
                    }))
                  }
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-brand-surface"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-brand-muted" />
                    <div>
                      <p className="text-sm text-brand-text">{method.label}</p>
                      <p className="text-xs text-brand-muted">
                        Expires {method.expires ?? "-"} | Last used{" "}
                        {formatCustomerDate(method.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-brand-muted" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-brand-muted" />
                  )}
                </button>

                {isExpanded ? (
                  <div className="border-t border-brand-border px-4 py-4">
                    <div className="space-y-0">
                      {buildPaymentMethodDetailRows(method).map((row) => (
                        <CustomerDetailRow key={row.label} label={row.label}>
                          {row.value}
                        </CustomerDetailRow>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AdminSectionCard>
  );
}
