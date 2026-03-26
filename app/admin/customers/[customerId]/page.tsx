"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, CreditCard } from "lucide-react";

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
    return "—";
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded border border-zinc-800/70 bg-zinc-900 p-5">
      <h2 className="mb-4 text-xs uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/50 py-2 last:border-0">
      <span className="min-w-[120px] shrink-0 text-sm text-zinc-500">{label}</span>
      <span className="min-w-0 flex-1 text-right text-sm text-gray-200 [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  );
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
        setError(loadError instanceof Error ? loadError.message : "Failed to load customer");
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
    return <div className="text-sm text-zinc-500">Loading customer…</div>;
  }

  if (error || !data) {
    return <div className="text-sm text-red-400">{error ?? "Customer not found."}</div>;
  }

  return (
    <div className="space-y-6 max-w-8xl">
      <button
        type="button"
        onClick={() => router.push("/admin/customers")}
        className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Customers
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{data.customer.name}</h1>
            <span
              className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${
                data.customer.kind === "guest"
                  ? "border-amber-800 bg-amber-950/40 text-amber-300"
                  : "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              }`}
            >
              {data.customer.kind === "guest" ? "Guest customer" : "Account customer"}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-zinc-500">{data.customer.displayId}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <SectionCard title="Payments">
            {data.payments.length === 0 ? (
              <p className="text-sm text-zinc-500">No payments recorded for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-800/70 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    <tr>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        onClick={() => router.push(`/admin/transactions/${payment.orderId}`)}
                        className="cursor-pointer border-b border-zinc-800/50 text-zinc-300 transition hover:bg-zinc-950/60"
                      >
                        <td className="py-3 text-white">{fmtMoney.format(payment.amount)}</td>
                        <td className="py-3">{payment.status}</td>
                        <td className="py-3 text-zinc-400">{fmtDate(payment.createdAt)}</td>
                        <td className="py-3 font-mono text-xs text-red-400">
                          #{payment.orderId.slice(0, 8)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Payment Methods">
            {data.paymentMethods.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No reusable payment-method history is available for this customer yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.paymentMethods.map((method) => {
                  const isExpanded = expandedMethods[method.id] ?? false;

                  return (
                    <div
                      key={method.id}
                      className="overflow-hidden rounded border border-zinc-800/70 bg-zinc-950/40"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMethods((current) => ({
                            ...current,
                            [method.id]: !isExpanded,
                          }))
                        }
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-zinc-900/70"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-zinc-500" />
                          <div>
                            <p className="text-sm text-white">{method.label}</p>
                            <p className="text-xs text-zinc-500">
                              Expires {method.expires ?? "—"} • Last used{" "}
                              {fmtDate(method.lastUsedAt)}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-zinc-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-500" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-zinc-800/70 px-4 py-4">
                          <div className="space-y-0">
                            <DetailRow label="Customer name">
                              {method.customerName ?? "—"}
                            </DetailRow>
                            <DetailRow label="Last 4">{method.last4 ?? "—"}</DetailRow>
                            <DetailRow label="Expires">{method.expires ?? "—"}</DetailRow>
                            <DetailRow label="Payment method ID">{method.id}</DetailRow>
                            <DetailRow label="Billing address">
                              {method.billingAddress ?? "—"}
                            </DetailRow>
                            <DetailRow label="Phone">{method.phone ?? "—"}</DetailRow>
                            <DetailRow label="Email">{method.email ?? "—"}</DetailRow>
                            <DetailRow label="Origin">{method.origin}</DetailRow>
                            <DetailRow label="CVC check">
                              {method.cvcCheck ?? "—"}
                            </DetailRow>
                            <DetailRow label="Street / ZIP check">
                              {method.streetZipCheck ?? "—"}
                            </DetailRow>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Customer Activity">
            {data.activityLog.length === 0 ? (
              <p className="text-sm text-zinc-500">No customer activity recorded.</p>
            ) : (
              <ol className="space-y-3">
                {data.activityLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded border border-zinc-800/60 bg-zinc-950/30 p-4"
                  >
                    <p className="text-sm text-white">{entry.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.description}</p>
                    <p className="mt-1 text-xs text-zinc-500">{fmtDate(entry.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Insights">
            <div className="grid gap-3">
              <div className="rounded border border-zinc-800/70 bg-zinc-950/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Total spend
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {fmtMoney.format(data.customer.totalSpend)}
                </p>
              </div>
              <div className="rounded border border-zinc-800/70 bg-zinc-950/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Payments
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {data.customer.paymentCount}
                </p>
              </div>
              <div className="rounded border border-zinc-800/70 bg-zinc-950/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Successful / refunded
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {insights?.successfulPayments ?? 0}
                </p>
              </div>
              <div className="rounded border border-zinc-800/70 bg-zinc-950/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Payment methods
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {insights?.totalPaymentMethods ?? 0}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Details">
            <div className="space-y-0">
              <DetailRow label="Customer ID">{data.customer.displayId}</DetailRow>
              <DetailRow label="Type">
                {data.customer.kind === "guest" ? "Guest customer" : "Account customer"}
              </DetailRow>
              <DetailRow label="Name">{data.customer.name}</DetailRow>
              <DetailRow label="Email">{data.customer.email ?? "—"}</DetailRow>
              <DetailRow label="Phone">{data.customer.phone ?? "—"}</DetailRow>
              <DetailRow label="Customer since">
                {fmtDate(data.customer.customerSince)}
              </DetailRow>
              <DetailRow label="Last updated">{fmtDate(data.customer.lastUpdated)}</DetailRow>
              <DetailRow label="Billing details">
                {data.customer.billingDetails ?? "—"}
              </DetailRow>
              <DetailRow label="Primary payment method">
                {data.customer.primaryPaymentMethod ?? "—"}
              </DetailRow>
              {data.customer.payrillaCustomerToken && (
                <DetailRow label="Payrilla token">
                  {data.customer.payrillaCustomerToken}
                </DetailRow>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
