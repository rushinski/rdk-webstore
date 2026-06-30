"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, CreditCard } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMetricCard } from "@/components/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type CustomerDetail = {
  routeId: string;
  displayId: string;
  kind: "account" | "guest";
  name: string;
  email: string | null;
  phone: string | null;
  customerSince: string | null;
  lastUpdated: string | null;
  billingDetails: string | null;
  totalSpend: number;
  paymentCount: number;
  primaryPaymentMethod: string | null;
  payrillaCustomerToken: string | null;
};

type CustomerPayment = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
};

type CustomerPaymentMethod = {
  id: string;
  label: string;
  lastUsedAt: string;
  expires: string | null;
  customerName: string | null;
  last4: string | null;
  billingAddress: string | null;
  phone: string | null;
  email: string | null;
  origin: string;
  cvcCheck: string | null;
  streetZipCheck: string | null;
};

type CustomerActivity = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

type CustomerDetailPayload = {
  customer: CustomerDetail;
  payments: CustomerPayment[];
  paymentMethods: CustomerPaymentMethod[];
  activityLog: CustomerActivity[];
};

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function fmtDate(iso: string | null | undefined, includeTime = true) {
  if (!iso) {
    return "-";
  }

  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "numeric" as const,
          minute: "2-digit" as const,
          hour12: true,
        }
      : {}),
  });
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-border py-2 last:border-0">
      <span className="min-w-[120px] shrink-0 text-sm text-brand-muted">{label}</span>
      <span className="min-w-0 flex-1 text-right text-sm text-brand-text [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  );
}

function getCustomerKindMeta(kind: CustomerDetail["kind"]) {
  if (kind === "guest") {
    return { label: "Guest customer", tone: "warning" as const };
  }

  return { label: "Account customer", tone: "success" as const };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;

  const [data, setData] = useState<CustomerDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadCustomer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/customers/${customerId}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load customer");
        }

        setData(payload);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load customer",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomer();
  }, [customerId]);

  const insights = useMemo(() => {
    if (!data) {
      return null;
    }

    const successfulPayments = data.payments.filter(
      (payment) => payment.status === "Succeeded" || payment.status === "Refunded",
    ).length;

    return {
      successfulPayments,
      totalPaymentMethods: data.paymentMethods.length,
    };
  }, [data]);

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
          value={fmtMoney.format(data.customer.totalSpend)}
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
          <AdminSectionCard title="Payments">
            {data.payments.length === 0 ? (
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
                    {data.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        onClick={() =>
                          router.push(`/admin/transactions/${payment.orderId}`)
                        }
                        className="cursor-pointer border-b border-brand-border transition hover:bg-brand-page"
                      >
                        <td className="p-3 text-brand-text">
                          {fmtMoney.format(payment.amount)}
                        </td>
                        <td className="p-3 text-brand-text">{payment.status}</td>
                        <td className="p-3 text-brand-muted">
                          {fmtDate(payment.createdAt)}
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

          <AdminSectionCard title="Payment Methods">
            {data.paymentMethods.length === 0 ? (
              <AdminEmptyState
                title="No Payment Methods"
                description="No reusable payment-method history is available for this customer yet."
              />
            ) : (
              <div className="space-y-3">
                {data.paymentMethods.map((method) => {
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
                              {fmtDate(method.lastUsedAt)}
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
                            <DetailRow label="Customer name">
                              {method.customerName ?? "-"}
                            </DetailRow>
                            <DetailRow label="Last 4">{method.last4 ?? "-"}</DetailRow>
                            <DetailRow label="Expires">{method.expires ?? "-"}</DetailRow>
                            <DetailRow label="Payment method ID">{method.id}</DetailRow>
                            <DetailRow label="Billing address">
                              {method.billingAddress ?? "-"}
                            </DetailRow>
                            <DetailRow label="Phone">{method.phone ?? "-"}</DetailRow>
                            <DetailRow label="Email">{method.email ?? "-"}</DetailRow>
                            <DetailRow label="Origin">{method.origin}</DetailRow>
                            <DetailRow label="CVC check">
                              {method.cvcCheck ?? "-"}
                            </DetailRow>
                            <DetailRow label="Street / ZIP check">
                              {method.streetZipCheck ?? "-"}
                            </DetailRow>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </AdminSectionCard>

          <AdminSectionCard title="Customer Activity">
            {data.activityLog.length === 0 ? (
              <AdminEmptyState
                title="No Activity Recorded"
                description="This customer does not have any timeline entries yet."
              />
            ) : (
              <ol className="space-y-3">
                {data.activityLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="border border-brand-border bg-brand-page p-4"
                  >
                    <p className="text-sm text-brand-text">{entry.title}</p>
                    <p className="mt-1 text-xs text-brand-muted">{entry.description}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      {fmtDate(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </AdminSectionCard>
        </div>

        <div className="space-y-6">
          <AdminSectionCard title="Details">
            <div className="space-y-0">
              <DetailRow label="Customer ID">{data.customer.displayId}</DetailRow>
              <DetailRow label="Type">
                {data.customer.kind === "guest" ? "Guest customer" : "Account customer"}
              </DetailRow>
              <DetailRow label="Name">{data.customer.name}</DetailRow>
              <DetailRow label="Email">{data.customer.email ?? "-"}</DetailRow>
              <DetailRow label="Phone">{data.customer.phone ?? "-"}</DetailRow>
              <DetailRow label="Customer since">
                {fmtDate(data.customer.customerSince)}
              </DetailRow>
              <DetailRow label="Last updated">
                {fmtDate(data.customer.lastUpdated)}
              </DetailRow>
              <DetailRow label="Billing details">
                {data.customer.billingDetails ?? "-"}
              </DetailRow>
              <DetailRow label="Primary payment method">
                {data.customer.primaryPaymentMethod ?? "-"}
              </DetailRow>
              {data.customer.payrillaCustomerToken ? (
                <DetailRow label="Payrilla token">
                  {data.customer.payrillaCustomerToken}
                </DetailRow>
              ) : null}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}
