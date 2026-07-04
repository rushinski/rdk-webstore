"use client";

import { formatCustomerDate } from "@/modules/customers/presentation/admin/customer-detail/customerDetailView";
import type { CustomerActivity } from "@/modules/customers/presentation/admin/customer-detail/useAdminCustomerDetailData";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type CustomerActivitySectionProps = {
  activityLog: CustomerActivity[];
};

export function CustomerActivitySection({ activityLog }: CustomerActivitySectionProps) {
  return (
    <AdminSectionCard title="Customer Activity">
      {activityLog.length === 0 ? (
        <AdminEmptyState
          title="No Activity Recorded"
          description="This customer does not have any timeline entries yet."
        />
      ) : (
        <ol className="space-y-3">
          {activityLog.map((entry) => (
            <li key={entry.id} className="border border-brand-border bg-brand-page p-4">
              <p className="text-sm text-brand-text">{entry.title}</p>
              <p className="mt-1 text-xs text-brand-muted">{entry.description}</p>
              <p className="mt-1 text-xs text-brand-muted">
                {formatCustomerDate(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </AdminSectionCard>
  );
}
