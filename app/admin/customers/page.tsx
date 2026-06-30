"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";

type CustomerRow = {
  routeId: string;
  displayId: string;
  kind: "account" | "guest";
  name: string;
  email: string | null;
  primaryPaymentMethod: string | null;
  createdAt: string;
  totalSpend: number;
  paymentCount: number;
};

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function fmtDate(iso: string | null | undefined) {
  if (!iso) {
    return "-";
  }

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCustomerTypeMeta(kind: CustomerRow["kind"]) {
  if (kind === "guest") {
    return { label: "Guest", tone: "warning" as const };
  }

  return { label: "Account", tone: "success" as const };
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/customers", { cache: "no-store" });
        const data = await response.json();
        setCustomers(data.customers ?? []);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.displayId,
        customer.name,
        customer.email ?? "",
        customer.primaryPaymentMethod ?? "",
        customer.kind,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        description="Profiles built from account, order, and payment history."
      />

      <div className="flex max-w-md items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2">
        <Search className="h-4 w-4 text-brand-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by customer, email, payment method, or ID"
          className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted focus:border-0`}
        />
      </div>

      <AdminSectionCard>
        {isLoading ? (
          <AdminEmptyState
            title="Loading Customers"
            description="Pulling account and guest profiles now."
          />
        ) : filteredCustomers.length === 0 ? (
          <AdminEmptyState
            title="No Customers Found"
            description="Try a different search or wait for new customer activity."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] sm:text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-page">
                  <th className="p-3 text-left font-semibold text-brand-muted sm:p-4">
                    Created
                  </th>
                  <th className="p-3 text-left font-semibold text-brand-muted sm:p-4">
                    Customer
                  </th>
                  <th className="hidden p-3 text-left font-semibold text-brand-muted sm:p-4 md:table-cell">
                    Type
                  </th>
                  <th className="hidden p-3 text-left font-semibold text-brand-muted sm:p-4 md:table-cell">
                    Email
                  </th>
                  <th className="hidden p-3 text-left font-semibold text-brand-muted sm:p-4 md:table-cell">
                    Payment
                  </th>
                  <th className="p-3 text-right font-semibold text-brand-muted sm:p-4">
                    Total Spend
                  </th>
                  <th className="hidden p-3 text-right font-semibold text-brand-muted sm:p-4 md:table-cell">
                    Payments
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const typeMeta = getCustomerTypeMeta(customer.kind);
                  const customerHref = `/admin/customers/${customer.routeId}`;

                  return (
                    <tr
                      key={customer.routeId}
                      role="link"
                      tabIndex={0}
                      aria-label={`View customer ${customer.displayId}`}
                      onClick={() => router.push(customerHref)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(customerHref);
                        }
                      }}
                      className="cursor-pointer border-b border-brand-border transition-colors hover:bg-brand-page focus-visible:bg-brand-page focus-visible:outline-none"
                    >
                      <td className="p-3 text-brand-muted sm:p-4">
                        {fmtDate(customer.createdAt)}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <div className="text-brand-text">{customer.name}</div>
                          <div className="font-mono text-xs text-brand-muted">
                            {customer.displayId}
                          </div>
                        </div>
                      </td>
                      <td className="hidden p-3 sm:p-4 md:table-cell">
                        <AdminStatusBadge tone={typeMeta.tone}>
                          {typeMeta.label}
                        </AdminStatusBadge>
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {customer.email ?? "-"}
                      </td>
                      <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                        {customer.primaryPaymentMethod ?? "-"}
                      </td>
                      <td className="p-3 text-right text-brand-text sm:p-4">
                        {fmtMoney.format(customer.totalSpend)}
                      </td>
                      <td className="hidden p-3 text-right text-brand-muted sm:p-4 md:table-cell">
                        {customer.paymentCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
