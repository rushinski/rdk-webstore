export type ShippingAddressDraft = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type ParcelDraft = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

export type AddressValidationStatus = "idle" | "validating" | "valid" | "invalid";

export type AddressErrors = {
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
};

export type EasyPostRate = {
  id: string;
  carrier?: string | null;
  service?: string | null;
  rate?: string | null;
  currency?: string | null;
  delivery_days?: number | null;
  estimated_delivery_days?: number | null;
};

export type OrderSummary = {
  id: string;
  shipping?: unknown;
};
