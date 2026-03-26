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

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function fmtDate(iso: string | null | undefined) {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
        <p className="text-sm text-zinc-400">
          Customer profiles built from order and payment history.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search customers"
          className="w-full border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-4 text-sm text-white outline-none transition focus:border-red-600"
        />
      </div>

      <div className="overflow-hidden border border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Primary payment</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Total spend</th>
                <th className="px-4 py-3 font-medium">Payments</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Loading customers…
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.routeId}
                    onClick={() => router.push(`/admin/customers/${customer.routeId}`)}
                    className="cursor-pointer border-b border-zinc-800/70 text-zinc-200 transition hover:bg-zinc-900/60"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-white">{customer.name}</p>
                        <p className="font-mono text-xs text-zinc-500">
                          {customer.displayId}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center border px-2 py-0.5 text-xs uppercase tracking-[0.16em] ${
                          customer.kind === "guest"
                            ? "border-amber-800 bg-amber-950/40 text-amber-300"
                            : "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                        }`}
                      >
                        {customer.kind === "guest" ? "Guest" : "Account"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-300">{customer.email ?? "—"}</td>
                    <td className="px-4 py-4 text-zinc-300">
                      {customer.primaryPaymentMethod ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{fmtDate(customer.createdAt)}</td>
                    <td className="px-4 py-4 text-white">{fmt.format(customer.totalSpend)}</td>
                    <td className="px-4 py-4 text-zinc-300">{customer.paymentCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
