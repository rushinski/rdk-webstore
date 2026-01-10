export type ShippingAddress = {
  name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type ShippingDefault = {
  category: string;
  shipping_cost_cents?: number | null;
  default_weight_oz?: number | null;
  default_length_in?: number | null;
  default_width_in?: number | null;
  default_height_in?: number | null;
};

export type ShippingOrigin = {
  name: string;
  company?: string | null;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type TabKey = "label" | "ready" | "shipped" | "delivered";
