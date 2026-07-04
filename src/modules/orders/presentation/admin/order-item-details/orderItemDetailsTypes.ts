export type AdminOrderItemImage = {
  url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type AdminOrderItemTagLink = {
  tag?: {
    label?: string | null;
    group_key?: string | null;
  } | null;
};

export type AdminOrderItem = {
  id: string;
  product_name?: string | null;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  condition?: string | null;
  variant_sku?: string | null;
  size_label?: string | null;
  quantity?: number | null;
  line_total?: number | null;
  refund_amount?: number | null;
  refunded_at?: string | null;
  unit_cost?: number | null;
  unit_price?: number | null;
  product?: {
    images?: AdminOrderItemImage[] | null;
    brand?: string | null;
    model?: string | null;
    name?: string | null;
    created_at?: string | null;
    category?: string | null;
    description?: string | null;
    tags?: AdminOrderItemTagLink[] | null;
  } | null;
  variant?: {
    sku?: string | null;
    size_label?: string | null;
    sale_price_cents?: number | null;
    unit_cost_cents?: number | null;
  } | null;
};
