"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CustomerActivitySection } from "@/modules/customers/presentation/admin/customer-detail/CustomerActivitySection";
import { CustomerDetailsPanel } from "@/modules/customers/presentation/admin/customer-detail/CustomerDetailsPanel";
import { CustomerPaymentMethodsSection } from "@/modules/customers/presentation/admin/customer-detail/CustomerPaymentMethodsSection";
import { CustomerPaymentsSection } from "@/modules/customers/presentation/admin/customer-detail/CustomerPaymentsSection";
import {
  formatCustomerMoney,
  getCustomerKindMeta,
} from "@/modules/customers/presentation/admin/customer-detail/customerDetailView";
import { useAdminCustomerDetailData } from "@/modules/customers/presentation/admin/customer-detail/useAdminCustomerDetailData";
import { AdminEmptyState } from "@/modules/shared/presentation/admin/ui/AdminEmptyState";
import { AdminMetricCard } from "@/modules/shared/presentation/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";

export function AdminCustomerDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { data, error, insights, isLoading } = useAdminCustomerDetailData(customerId);

  if (isLoading) {
    return (
      <AdminEmptyState
        title="Loading Customer"
        description="Building this customer record from account and payment data."
      />
    );
  }

  if (error || !data) {
    return (
      <AdminEmptyState
        title="Customer Not Found"
        description={error ?? "This customer record could not be loaded."}
      />
    );
  }

  const customerKindMeta = getCustomerKindMeta(data.customer.kind);

  return (
    <div className="max-w-8xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/customers")}
          className={`${adminButtonStyles.secondary} gap-2`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back To Customers
        </button>
      </div>

      <AdminPageHeader
        title={data.customer.name}
        description={data.customer.displayId}
        actions={
          <AdminStatusBadge tone={customerKindMeta.tone}>
            {customerKindMeta.label}
          </AdminStatusBadge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Total Spend"
          value={formatCustomerMoney(data.customer.totalSpend)}
        />
        <AdminMetricCard label="Payments" value={String(data.customer.paymentCount)} />
        <AdminMetricCard
          label="Successful / Refunded"
          value={String(insights?.successfulPayments ?? 0)}
        />
        <AdminMetricCard
          label="Payment Methods"
          value={String(insights?.totalPaymentMethods ?? 0)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <CustomerPaymentsSection payments={data.payments} />
          <CustomerPaymentMethodsSection paymentMethods={data.paymentMethods} />
          <CustomerActivitySection activityLog={data.activityLog} />
        </div>

        <div className="space-y-6">
          <CustomerDetailsPanel customer={data.customer} />
        </div>
      </div>
    </div>
  );
}

