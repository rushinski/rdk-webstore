import type { ShippingOrigin, TabKey } from "@/types/domain/shipping";

export const SHIPPING_PAGE_SIZE = 8;
export const SHIPPING_ORDER_STATUSES = ["paid", "shipped"];

export const EMPTY_SHIPPING_ORIGIN: ShippingOrigin = {
  name: "",
  company: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

type OriginField = keyof ShippingOrigin;
export type OriginErrors = Partial<Record<OriginField, string>>;

export const SHIPPING_TABS: Array<{ key: TabKey; label: string; status: string }> = [
  { key: "label", label: "Review & Create Label", status: "unfulfilled" },
  { key: "ready", label: "Need to Ship", status: "ready_to_ship" },
  { key: "shipped", label: "Shipped", status: "shipped" },
  { key: "delivered", label: "Delivered", status: "delivered" },
];

export function extractShippingOriginErrors(
  issues: Record<string, { _errors?: string[] }> | undefined,
): OriginErrors {
  const next: OriginErrors = {};
  if (!issues || typeof issues !== "object") {
    return next;
  }

  const fields: OriginField[] = [
    "name",
    "company",
    "phone",
    "line1",
    "line2",
    "city",
    "state",
    "postal_code",
    "country",
  ];

  fields.forEach((field) => {
    const entry = issues[field];
    if (entry?._errors?.length) {
      next[field] = entry._errors[0];
    }
  });

  return next;
}

export function validateShippingOrigin(origin: ShippingOrigin): OriginErrors {
  const errors: OriginErrors = {};
  const name = origin.name.trim();
  const company = (origin.company ?? "").trim();

  if (!name && !company) {
    const message = "Enter a contact name or company.";
    errors.name = message;
    errors.company = message;
  }
  if (!origin.line1.trim()) {
    errors.line1 = "Street address is required.";
  }
  if (!origin.city.trim()) {
    errors.city = "City is required.";
  }
  if (!origin.state.trim()) {
    errors.state = "State is required.";
  }
  if (!origin.postal_code.trim()) {
    errors.postal_code = "ZIP / postal code is required.";
  }
  if (!origin.country.trim()) {
    errors.country = "Country is required.";
  }

  return errors;
}
