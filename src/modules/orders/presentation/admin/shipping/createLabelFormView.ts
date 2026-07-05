import type {
  AddressErrors,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";
import type { ShippingAddress } from "@/types/domain/shipping";

export const resolveShippingAddress = (value: unknown): ShippingAddress | null => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as ShippingAddress | null;
  }
  if (typeof value === "object") {
    return value as ShippingAddress;
  }
  return null;
};

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const buildInitialRecipient = (
  shipping: ShippingAddress | null,
): ShippingAddressDraft => ({
  name: clean(shipping?.name) || "",
  phone: clean(shipping?.phone) || "",
  line1: clean(shipping?.line1) || "",
  line2: clean(shipping?.line2) || "",
  city: clean(shipping?.city) || "",
  state: clean(shipping?.state) || "",
  postal_code: clean(shipping?.postal_code) || "",
  country: clean(shipping?.country) || "US",
});

export const buildInitialParcel = (initialPackage?: ParcelDraft | null): ParcelDraft =>
  initialPackage ?? { weight: 16, length: 12, width: 12, height: 12 };

export const money = (rateStr?: string | null, currency?: string | null) => {
  const rate = Number(rateStr ?? "");
  if (Number.isFinite(rate)) {
    return `${currency?.toUpperCase() === "USD" || !currency ? "$" : ""}${rate.toFixed(2)}`;
  }
  return rateStr ?? "-";
};

export const formatDeliveryEstimate = (days?: number | null) => {
  if (!days || days <= 0) {
    return null;
  }
  const businessDays = Math.ceil(days);
  if (businessDays === 1) {
    return "Next business day";
  }
  if (businessDays === 2) {
    return "2 business days";
  }
  if (businessDays <= 5) {
    return `${businessDays} business days`;
  }
  const calendarDays = Math.ceil(businessDays * 1.4);
  return `${calendarDays} days`;
};

export const validateAddress = (address: ShippingAddressDraft): AddressErrors => {
  const errors: AddressErrors = {};

  if (!address.phone || address.phone.length < 10) {
    errors.phone = "Phone number required (10+ digits)";
  }
  if (!address.line1 || address.line1.length < 3) {
    errors.line1 = "Street address is required";
  }
  if (!address.city || address.city.length < 2) {
    errors.city = "City is required";
  }
  if (!address.state || address.state.length !== 2) {
    errors.state = "State must be 2 letters (e.g., CA, NY)";
  }
  if (!address.postal_code || !/^\d{5}(-\d{4})?$/.test(address.postal_code)) {
    errors.postal_code = "ZIP code must be 5 digits or 5+4 format";
  }
  if (!address.country || address.country.length !== 2) {
    errors.country = "Country must be 2 letters (e.g., US)";
  }

  return errors;
};

export const getErrorMessage = (error: string): string => {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("address") && lowerError.includes("invalid")) {
    return "The recipient address is invalid. Please check street, city, state, and ZIP code.";
  }
  if (lowerError.includes("postal") || lowerError.includes("zip")) {
    return "Invalid ZIP code. Please enter a valid 5-digit ZIP code.";
  }
  if (lowerError.includes("carrier") && lowerError.includes("not")) {
    return "No carriers are enabled. Please enable carriers in Shipping Settings.";
  }
  if (lowerError.includes("rate")) {
    return "No shipping rates available. This may be due to package dimensions or destination. Try adjusting the package size.";
  }
  if (lowerError.includes("origin")) {
    return "Shipping origin address is not configured. Please set it in Shipping Settings.";
  }
  if (lowerError.includes("weight") || lowerError.includes("dimension")) {
    return "Invalid package dimensions. Weight must be > 0 oz, dimensions must be > 0 inches.";
  }
  if (lowerError.includes("already")) {
    return "A shipping label has already been purchased for this order.";
  }

  return error;
};
