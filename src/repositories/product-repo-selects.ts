export const PRODUCT_RELATIONS_SELECT =
  "*, variants:product_variants(*), images:product_images(*), tags:product_tags(tag:tags(*))";

export const PRODUCT_VARIANT_EXPORT_SELECT =
  "sku, size_label, sale_price_cents, unit_cost_cents, stock, product:products!inner(name, condition, is_active, is_out_of_stock, tenant_id, category)";

export const PRODUCT_ORDER_ITEM_DETAILED_SELECT =
  "*, product:products(id, name, brand, model, category, created_at, description, images:product_images(url, is_primary, sort_order), tags:product_tags(tag:tags(label, group_key))), variant:product_variants(id, sku, size_label, sale_price_cents, unit_cost_cents)";

export const PRODUCT_USER_ORDER_VARIANTS_SELECT =
  "*, items:order_items(*, product:products(id, name, brand, model), variant:product_variants(id, sku, size_label, sale_price_cents))";
