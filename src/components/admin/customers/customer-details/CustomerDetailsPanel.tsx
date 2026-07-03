"use client";

import { CustomerDetailRow } from "@/components/admin/customers/customer-details/CustomerDetailRow";
import { formatCustomerDate } from "@/components/admin/customers/customer-details/customerDetailView";
import type { CustomerDetail } from "@/components/admin/customers/customer-details/useAdminCustomerDetailData";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type CustomerDetailsPanelProps = {
  customer: CustomerDetail;
};

export function CustomerDetailsPanel({ customer }: CustomerDetailsPanelProps) {
  return (
    <AdminSectionCard title="Details">
      <div className="space-y-0">
        <CustomerDetailRow label="Customer ID">{customer.displayId}</CustomerDetailRow>
        <CustomerDetailRow label="Type">
          {customer.kind === "guest" ? "Guest customer" : "Account customer"}
        </CustomerDetailRow>
        <CustomerDetailRow label="Name">{customer.name}</CustomerDetailRow>
        <CustomerDetailRow label="Email">{customer.email ?? "-"}</CustomerDetailRow>
        <CustomerDetailRow label="Phone">{customer.phone ?? "-"}</CustomerDetailRow>
        <CustomerDetailRow label="Customer since">
          {formatCustomerDate(customer.customerSince)}
        </CustomerDetailRow>
        <CustomerDetailRow label="Last updated">
          {formatCustomerDate(customer.lastUpdated)}
        </CustomerDetailRow>
        <CustomerDetailRow label="Billing details">
          {customer.billingDetails ?? "-"}
        </CustomerDetailRow>
        <CustomerDetailRow label="Primary payment method">
          {customer.primaryPaymentMethod ?? "-"}
        </CustomerDetailRow>
      </div>
    </AdminSectionCard>
  );
}
