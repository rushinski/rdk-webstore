import type { AdminCustomersRow } from "@/modules/customers/presentation/admin/useAdminCustomersData";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCustomerDate(iso: string | null | undefined) {
  if (!iso) {
    return "-";
  }

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCustomerTotalSpend(totalSpend: number) {
  return moneyFormatter.format(totalSpend);
}

export function getCustomerTypeMeta(kind: AdminCustomersRow["kind"]) {
  if (kind === "guest") {
    return { label: "Guest", tone: "warning" as const };
  }

  return { label: "Account", tone: "success" as const };
}

export function buildFilteredCustomers(
  customers: AdminCustomersRow[],
  searchQuery: string,
) {
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
}
