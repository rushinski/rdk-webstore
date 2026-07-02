"use client";

export const SHIPPING_CATEGORIES = [
  { key: "sneakers", label: "Sneakers" },
  { key: "clothing", label: "Clothing" },
  { key: "accessories", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
];

export const AVAILABLE_CARRIERS = [
  { key: "UPS", label: "UPS", description: "United Parcel Service" },
  { key: "USPS", label: "USPS", description: "United States Postal Service" },
  { key: "FedEx", label: "FedEx", description: "Federal Express" },
];

export type ShippingDefaultValues = {
  shipping_cost_cents: number;
  default_weight_oz: number;
  default_length_in: number;
  default_width_in: number;
  default_height_in: number;
};

export const defaultPackage: ShippingDefaultValues = {
  shipping_cost_cents: 0,
  default_weight_oz: 16,
  default_length_in: 12,
  default_width_in: 12,
  default_height_in: 12,
};

export const initialOrigin = {
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

export type ShippingOriginAddress = typeof initialOrigin;
export type OriginField = keyof ShippingOriginAddress;
export type OriginErrors = Partial<Record<OriginField, string>>;

export const ORIGIN_CONTACT_REQUIRED_MESSAGE = "Contact name or company is required.";

export function moneyToCents(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") {
    return 0;
  }

  const firstDot = cleaned.indexOf(".");
  let normalized = cleaned;

  if (firstDot !== -1) {
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
    normalized = before + after;
  }

  const [whole, frac = ""] = normalized.split(".");
  const wholeNum = Number(whole || "0");
  if (!Number.isFinite(wholeNum)) {
    return 0;
  }

  const centsStr = `${frac}00`.slice(0, 2);
  const centsNum = Number(centsStr || "0");
  if (!Number.isFinite(centsNum)) {
    return 0;
  }

  return wholeNum * 100 + centsNum;
}

export function centsToMoneyString(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0;
  return (safe / 100).toFixed(2);
}

export function extractOriginErrors(
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

export function validateOriginDraft(draft: ShippingOriginAddress): OriginErrors {
  const errors: OriginErrors = {};
  const name = draft.name.trim();
  const company = (draft.company ?? "").trim();

  if (!name && !company) {
    errors.name = ORIGIN_CONTACT_REQUIRED_MESSAGE;
    errors.company = ORIGIN_CONTACT_REQUIRED_MESSAGE;
  }
  if (!draft.line1.trim()) {
    errors.line1 = "Street address is required.";
  }
  if (!draft.city.trim()) {
    errors.city = "City is required.";
  }
  if (!draft.state.trim()) {
    errors.state = "State is required.";
  }
  if (!draft.postal_code.trim()) {
    errors.postal_code = "ZIP / postal code is required.";
  }
  if (!draft.country.trim()) {
    errors.country = "Country is required.";
  }

  return errors;
}
