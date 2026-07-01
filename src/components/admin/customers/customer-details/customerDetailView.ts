import type {
  CustomerDetail,
  CustomerPaymentMethod,
} from "@/components/admin/customers/customer-details/useAdminCustomerDetailData";

const customerMoneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCustomerMoney(value: number) {
  return customerMoneyFormatter.format(value);
}

export function formatCustomerDate(iso: string | null | undefined, includeTime = true) {
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

export function getCustomerKindMeta(kind: CustomerDetail["kind"]) {
  if (kind === "guest") {
    return { label: "Guest customer", tone: "warning" as const };
  }

  return { label: "Account customer", tone: "success" as const };
}

export function buildPaymentMethodDetailRows(method: CustomerPaymentMethod) {
  return [
    { label: "Customer name", value: method.customerName ?? "-" },
    { label: "Last 4", value: method.last4 ?? "-" },
    { label: "Expires", value: method.expires ?? "-" },
    { label: "Payment method ID", value: method.id },
    { label: "Billing address", value: method.billingAddress ?? "-" },
    { label: "Phone", value: method.phone ?? "-" },
    { label: "Email", value: method.email ?? "-" },
    { label: "Origin", value: method.origin },
    { label: "CVC check", value: method.cvcCheck ?? "-" },
    { label: "Street / ZIP check", value: method.streetZipCheck ?? "-" },
  ];
}
