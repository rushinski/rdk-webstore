import type { TablesInsert, TablesUpdate } from "@/types/db/database.types";

import type { CreatePendingOrderInput } from "@/repositories/orders-repo";

type OrderInsert = TablesInsert<"orders">;
type OrderItemInsert = TablesInsert<"order_items">;

export const ORDER_LIST_SELECT =
  "*, profiles!user_id(email), items:order_items(*, product:products(id, name, brand, model, category, created_at, description, images:product_images(url, is_primary, sort_order), tags:product_tags(tag:tags(label, group_key))), variant:product_variants(id, sku, size_label, sale_price_cents, unit_cost_cents)), shipping:order_shipping(*)";

export const ORDER_PAGED_SELECT =
  "*, profiles!user_id(email), items:order_items(*, product:products(id, name, brand, model, category, created_at, description, images:product_images(url, is_primary, sort_order), tags:product_tags(tag:tags(label, group_key))), variant:product_variants(id, sku, size_label, sale_price_cents, unit_cost_cents)), shipping:order_shipping(*), payment:payment_transactions(card_type, card_last4, paymentStatus:payment_status)";

export const ORDER_ANALYTICS_SELECT =
  "id, created_at, subtotal, total, refund_amount, items:order_items(quantity, unit_cost, refunded_at)";

export const ORDER_ITEMS_DETAILED_SELECT =
  "*, product:products(id, name, brand, model, category, created_at, description, images:product_images(url, is_primary, sort_order), tags:product_tags(tag:tags(label, group_key))), variant:product_variants(id, sku, size_label, sale_price_cents, unit_cost_cents)";

export const USER_ORDERS_SELECT =
  "*, items:order_items(*, product:products(id, name, brand, model), variant:product_variants(id, sku, size_label, sale_price_cents))";

export function buildPendingOrderInsert(input: CreatePendingOrderInput): OrderInsert {
  return {
    user_id: input.userId,
    guest_email: input.guestEmail ?? null,
    tenant_id: input.tenantId,
    seller_id: input.sellerId ?? null,
    currency: input.currency,
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    status: "pending",
    fulfillment: input.fulfillment,
    idempotency_key: input.idempotencyKey,
    cart_hash: input.cartHash,
    expires_at: input.expiresAt.toISOString(),
    pickup_location_id: input.pickupLocationId ?? null,
    pickup_instructions: input.pickupInstructions ?? null,
  };
}

export function buildPendingOrderItemsInsert(
  orderId: string,
  items: CreatePendingOrderInput["items"],
): OrderItemInsert[] {
  return items.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    variant_id: item.variantId,
    variant_sku: item.variantSku,
    product_name: item.productName,
    brand: item.brand,
    model: item.model,
    category: item.category,
    condition: item.condition,
    size_label: item.sizeLabel,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    unit_cost: item.unitCost,
    line_total: item.lineTotal,
  }));
}

export function buildPagedRange(page: number, limit: number) {
  const safePage = Math.max(page, 1);
  const start = (safePage - 1) * limit;
  const end = start + limit - 1;

  return { end, start };
}

export function buildReadyToShipUpdate(input: {
  carrier?: string | null;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  labelCreatedBy?: string | null;
  actualShippingCost?: number | null;
}): TablesUpdate<"orders"> {
  const updateData: TablesUpdate<"orders"> = {
    fulfillment_status: "ready_to_ship",
    shipping_carrier: input.carrier ?? null,
    tracking_number: input.trackingNumber ?? null,
    shipped_at: null,
  };

  if (input.labelUrl) {
    updateData.label_url = input.labelUrl;
    updateData.label_created_at = new Date().toISOString();
  }

  if (input.labelCreatedBy) {
    updateData.label_created_by = input.labelCreatedBy;
  }

  if (input.actualShippingCost !== null && input.actualShippingCost !== undefined) {
    updateData.actual_shipping_cost_cents = input.actualShippingCost;
  }

  return updateData;
}
