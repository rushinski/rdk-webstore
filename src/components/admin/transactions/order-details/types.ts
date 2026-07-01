export type ProductImage = { url: string; is_primary?: boolean; sort_order?: number };

export type OrderItem = {
  id: string;
  product_name?: string | null;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  condition?: string | null;
  variant_sku?: string | null;
  size_label?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost?: number | null;
  line_total: number;
  refund_amount?: number | null;
  refunded_at?: string | null;
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    description?: string | null;
    created_at?: string | null;
    images?: ProductImage[];
    tags?: { tag?: { label?: string | null; group_key?: string | null } | null }[];
  } | null;
  variant?: {
    id: string;
    sku?: string | null;
    size_label?: string | null;
    sale_price_cents?: number | null;
    unit_cost_cents?: number | null;
  } | null;
};

export type OrderShipping = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
};

export type Order = {
  id: string;
  user_id?: string | null;
  status?: string | null;
  total?: number | null;
  subtotal?: number | null;
  shipping?: number | null;
  tax_amount?: number | null;
  refund_amount?: number | null;
  refunded_at?: string | null;
  fulfillment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  guest_email?: string | null;
  failure_reason?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  label_url?: string | null;
  label_created_at?: string | null;
  profiles?: { email?: string | null; full_name?: string | null } | null;
  items?: OrderItem[];
  shipping_address?: OrderShipping | OrderShipping[] | null;
};

export type PaymentTransaction = {
  id: string;
  payrilla_reference_number?: number | null;
  payrilla_auth_code?: string | null;
  payrilla_status?: string | null;
  card_type?: string | null;
  card_last4?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
  avs_result_code?: string | null;
  cvv2_result_code?: string | null;
  three_ds_status?: string | null;
  nofraud_transaction_id?: string | null;
  nofraud_decision?: string | null;
  amount_authorized?: number | null;
  amount_captured?: number | null;
  billing_name?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_zip?: string | null;
  billing_country?: string | null;
  billing_phone?: string | null;
  customer_email?: string | null;
  customer_ip?: string | null;
};

export type PaymentEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};

export type EmailLog = {
  id: string;
  email_type: string;
  recipient_email: string;
  subject?: string | null;
  sent_at: string;
  delivered_at?: string | null;
  opened_at?: string | null;
  delivery_status: string;
  message_id?: string | null;
  html_snapshot?: string | null;
};

export type TrackingEvent = {
  id: string;
  status: string;
  description?: string | null;
  location?: string | null;
  event_timestamp: string;
};

export type CheckoutLog = {
  id: string;
  route: string;
  method: string;
  http_status?: number | null;
  duration_ms?: number | null;
  event_label?: string | null;
  error_message?: string | null;
  request_payload?: unknown;
  response_payload?: unknown;
  created_at: string;
};

export type TransactionPayload = {
  order: Order;
  paymentTransaction: PaymentTransaction | null;
  paymentEvents: PaymentEvent[];
  emailLogs: EmailLog[];
  trackingEvents: TrackingEvent[];
  checkoutLogs: CheckoutLog[];
  customer?: {
    routeId: string;
    displayId: string;
    kind: "account" | "guest";
    name: string;
    email: string | null;
  } | null;
};

export type SessionEntry =
  | { id: string; kind: "payment"; timestamp: string; data: PaymentEvent }
  | { id: string; kind: "email"; timestamp: string; data: EmailLog };
