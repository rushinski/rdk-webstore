"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
    return { label: "Guest", className: "text-amber-300" };
  }

  return { label: "Account", className: "text-emerald-300" };
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
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Customers</h1>
        <p className="text-gray-400">Profiles built from account, order, and payment history</p>
      </div>

      <div className="flex items-center gap-2 border border-zinc-800/70 bg-zinc-900 px-3 py-2 max-w-md">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by customer, email, payment method, or ID"
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>

      <div className="overflow-hidden rounded border border-zinc-800/70 bg-zinc-900">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70 bg-zinc-800">
                  <th className="p-3 text-left font-semibold text-gray-400 sm:p-4">Created</th>
                  <th className="p-3 text-left font-semibold text-gray-400 sm:p-4">Customer</th>
                  <th className="hidden md:table-cell p-3 text-left font-semibold text-gray-400 sm:p-4">
                    Type
                  </th>
                  <th className="hidden md:table-cell p-3 text-left font-semibold text-gray-400 sm:p-4">
                    Email
                  </th>
                  <th className="hidden md:table-cell p-3 text-left font-semibold text-gray-400 sm:p-4">
                    Payment
                  </th>
                  <th className="p-3 text-right font-semibold text-gray-400 sm:p-4">
                    Total Spend
                  </th>
                  <th className="hidden md:table-cell p-3 text-right font-semibold text-gray-400 sm:p-4">
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
                      className="cursor-pointer border-b border-zinc-800/70 transition-colors hover:bg-zinc-800 focus-visible:bg-zinc-800 focus-visible:outline-none"
                    >
                      <td className="p-3 text-gray-400 sm:p-4">{fmtDate(customer.createdAt)}</td>
                      <td className="p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <div className="text-white">{customer.name}</div>
                          <div className="font-mono text-xs text-gray-500">
                            {customer.displayId}
                          </div>
                        </div>
                      </td>
                      <td className={`hidden md:table-cell p-3 sm:p-4 ${typeMeta.className}`}>
                        {typeMeta.label}
                      </td>
                      <td className="hidden md:table-cell p-3 text-gray-400 sm:p-4">
                        {customer.email ?? "-"}
                      </td>
                      <td className="hidden md:table-cell p-3 text-gray-400 sm:p-4">
                        {customer.primaryPaymentMethod ?? "-"}
                      </td>
                      <td className="p-3 text-right text-white sm:p-4">
                        {fmtMoney.format(customer.totalSpend)}
                      </td>
                      <td className="hidden md:table-cell p-3 text-right text-gray-400 sm:p-4">
                        {customer.paymentCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
