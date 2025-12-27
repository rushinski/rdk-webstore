// src/repositories/orders-repo.ts (NEW)

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { generatePublicToken } from "@/lib/crypto";

type OrderRow = Tables<"orders">;
type OrderInsert = TablesInsert<"orders">;
type OrderUpdate = TablesUpdate<"orders">;

type OrderItemRow = Tables<"order_items">;
type OrderItemInsert = TablesInsert<"order_items">;

export interface CreatePendingOrderInput {
  userId: string | null;
  tenantId: string;
  sellerId?: string | null;
  marketplaceId?: string | null;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  fulfillment: "ship" | "pickup";
  idempotencyKey: string;
  cartHash: string;
  expiresAt: Date;
  items: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    lineTotal: number;
  }>;
}

export class OrdersRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByIdempotencyKey(idempotencyKey: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getById(orderId: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getByIdAndUser(orderId: string, userId: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getByIdAndToken(orderId: string, publicToken: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("public_token", publicToken)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createPendingOrder(input: CreatePendingOrderInput): Promise<OrderRow> {
    const publicToken = generatePublicToken();

    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .insert({
        user_id: input.userId,
        tenant_id: input.tenantId,
        seller_id: input.sellerId ?? null,
        marketplace_id: input.marketplaceId ?? null,
        currency: input.currency,
        subtotal: input.subtotal,
        shipping: input.shipping,
        total: input.total,
        status: "pending",
        fulfillment: input.fulfillment,
        idempotency_key: input.idempotencyKey,
        cart_hash: input.cartHash,
        public_token: publicToken,
        expires_at: input.expiresAt.toISOString(),
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems: OrderItemInsert[] = input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      unit_cost: item.unitCost,
      line_total: item.lineTotal,
    }));

    const { error: itemsError } = await this.supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  }

  async updateStripeSession(orderId: string, stripeSessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({ stripe_session_id: stripeSessionId })
      .eq("id", orderId);

    if (error) throw error;
  }

  async markPaidTransactionally(
    orderId: string,
    stripePaymentIntentId: string,
    itemsToDecrement: Array<{ productId: string; variantId: string | null; quantity: number }>
  ): Promise<void> {
    // Update order status
    const { error: orderError } = await this.supabase
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .eq("id", orderId)
      .eq("status", "pending"); // only update if still pending

    if (orderError) throw orderError;

    // Decrement inventory
    for (const item of itemsToDecrement) {
      if (item.variantId) {
        // Decrement variant stock
        const { error: variantError } = await this.supabase.rpc("decrement_variant_stock", {
          p_variant_id: item.variantId,
          p_quantity: item.quantity,
        });

        if (variantError) throw variantError;
      }
    }
  }

  async getOrderItems(orderId: string): Promise<OrderItemRow[]> {
    const { data, error } = await this.supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (error) throw error;
    return data ?? [];
  }

  async listOrders(params?: {
    status?: string[];
    fulfillment?: string;
    fulfillmentStatus?: string;
    limit?: number;
  }) {
    let query = this.supabase
      .from("orders")
      .select("*, items:order_items(*, product:products(id, name, brand, model, title_display, category), variant:product_variants(id, size_label, price_cents, cost_cents)), shipping:order_shipping(*)")
      .order("created_at", { ascending: false });

    if (params?.status?.length) {
      query = query.in("status", params.status);
    }
    if (params?.fulfillment) {
      query = query.eq("fulfillment", params.fulfillment);
    }
    if (params?.fulfillmentStatus) {
      query = query.eq("fulfillment_status", params.fulfillmentStatus);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async listOrdersForUser(userId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*, items:order_items(*, product:products(id, name, brand, model, title_display), variant:product_variants(id, size_label, price_cents))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async markRefunded(orderId: string, amount: number): Promise<OrderRow> {
    const { data, error } = await this.supabase
      .from("orders")
      .update({
        status: "refunded",
        refund_amount: amount,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return data as OrderRow;
  }

  async markFulfilled(
    orderId: string,
    input: { carrier?: string | null; trackingNumber?: string | null }
  ): Promise<OrderRow> {
    const { data, error } = await this.supabase
      .from("orders")
      .update({
        fulfillment_status: "shipped",
        shipping_carrier: input.carrier ?? null,
        tracking_number: input.trackingNumber ?? null,
        shipped_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return data as OrderRow;
  }
}
