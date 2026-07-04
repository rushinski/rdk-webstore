import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/db/database.types";
import {
  buildPagedRange,
  buildPendingOrderInsert,
  buildPendingOrderItemsInsert,
  buildReadyToShipUpdate,
  ORDER_ANALYTICS_SELECT,
  ORDER_ITEMS_DETAILED_SELECT,
  ORDER_LIST_SELECT,
  ORDER_PAGED_SELECT,
  USER_ORDERS_SELECT,
} from "@/modules/orders/infrastructure/orders-repo-helpers";

type OrderRow = Tables<"orders">;
type OrderUpdate = TablesUpdate<"orders">;

type OrderItemRow = Tables<"order_items">;
type OrderItemInsert = TablesInsert<"order_items">;

export interface CreatePendingOrderInput {
  userId: string | null;
  guestEmail?: string | null;
  tenantId: string;
  sellerId?: string | null;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  fulfillment: "ship" | "pickup";
  idempotencyKey: string;
  cartHash: string;
  expiresAt: Date;
  pickupLocationId?: string | null;
  pickupInstructions?: string | null;
  items: Array<{
    productId: string;
    variantId: string | null;
    variantSku: string;
    productName: string;
    brand: string;
    model: string | null;
    category: string;
    condition: string;
    sizeLabel: string;
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

    if (error) {
      throw error;
    }
    return data;
  }

  async getById(orderId: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  }

  async getByIdAndUser(orderId: string, userId: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  }

  async getByIdAndToken(orderId: string, publicToken: string): Promise<OrderRow | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("public_token", publicToken)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  }

  async createPendingOrder(input: CreatePendingOrderInput): Promise<OrderRow> {
    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .insert(buildPendingOrderInsert(input))
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderItems: OrderItemInsert[] = buildPendingOrderItemsInsert(
      order.id,
      input.items,
    );

    const { error: itemsError } = await this.supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw itemsError;
    }

    return order;
  }

  async updateGuestEmail(orderId: string, guestEmail: string): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({ guest_email: guestEmail })
      .eq("id", orderId);

    if (error) {
      throw error;
    }
  }

  async updatePaymentTransactionId(
    orderId: string,
    paymentTransactionId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({ payment_transaction_id: paymentTransactionId })
      .eq("id", orderId);

    if (error) {
      throw error;
    }
  }

  async resetFailedOrderForRetry(orderId: string, expiresAt: Date): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({
        status: "pending",
        failure_reason: null,
        payment_transaction_id: null,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "failed");

    if (error) {
      throw error;
    }
  }

  async updatePricingAndFulfillment(
    orderId: string,
    input: {
      subtotal: number;
      shipping: number;
      total: number;
      fulfillment: "ship" | "pickup";
      cartHash: string;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({
        subtotal: input.subtotal,
        shipping: input.shipping,
        total: input.total,
        fulfillment: input.fulfillment,
        cart_hash: input.cartHash,
      })
      .eq("id", orderId);

    if (error) {
      throw error;
    }
  }

  async markPaidTransactionally(
    orderId: string,
    paymentTransactionId: string,
    itemsToDecrement: Array<{
      productId: string | null;
      variantId: string | null;
      quantity: number;
    }>,
  ): Promise<boolean> {
    const payload = itemsToDecrement
      .filter((item) => item.variantId)
      .map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
      }));

    const { data, error } = await this.supabase.rpc("mark_order_paid_and_decrement", {
      p_order_id: orderId,
      p_stripe_payment_intent_id: paymentTransactionId,
      p_items: payload,
    });

    if (error) {
      throw error;
    }
    return data === true;
  }

  async getOrderItems(orderId: string): Promise<OrderItemRow[]> {
    const { data, error } = await this.supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async getOrderItemsByIds(orderId: string, itemIds: string[]): Promise<OrderItemRow[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .in("id", itemIds);

    if (error) {
      throw error;
    }
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
      .select(ORDER_LIST_SELECT)
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
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async listOrdersForAnalytics(params?: { status?: string[]; since?: string }) {
    let query = this.supabase
      .from("orders")
      .select(ORDER_ANALYTICS_SELECT)
      .order("created_at", { ascending: false });

    if (params?.status?.length) {
      query = query.in("status", params.status);
    }
    if (params?.since) {
      query = query.gte("created_at", params.since);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async listOrdersPaged(params?: {
    status?: string[];
    fulfillment?: string;
    fulfillmentStatus?: string;
    limit?: number;
    page?: number;
    incomplete?: boolean;
    includeAll?: boolean;
  }) {
    let query = this.supabase
      .from("orders")
      .select(ORDER_PAGED_SELECT, { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.incomplete) {
      query = query.eq("status", "pending").lt("expires_at", new Date().toISOString());
    } else if (params?.status?.length) {
      query = query.in("status", params.status);
    } else if (!params?.includeAll) {
      query = query.neq("status", "refunded");
    }

    if (params?.fulfillment) {
      query = query.eq("fulfillment", params.fulfillment);
    }
    if (params?.fulfillmentStatus) {
      query = query.eq("fulfillment_status", params.fulfillmentStatus);
    }
    if (params?.limit) {
      const { end, start } = buildPagedRange(params.page ?? 1, params.limit);
      query = query.range(start, end);
    }

    const { data, error, count } = await query;
    if (error) {
      throw error;
    }
    return { orders: data ?? [], count: count ?? 0 };
  }

  async getOrderItemsDetailed(orderId: string) {
    const { data, error } = await this.supabase
      .from("order_items")
      .select(ORDER_ITEMS_DETAILED_SELECT)
      .eq("order_id", orderId);

    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async listOrdersForUser(userId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(USER_ORDERS_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
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

    if (error) {
      throw error;
    }
    return data as OrderRow;
  }

  async updateRefundSummary(
    orderId: string,
    input: {
      status: string;
      refundAmount: number;
      refundedAt?: string | null;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({
        status: input.status,
        refund_amount: input.refundAmount,
        refunded_at:
          input.refundedAt !== undefined
            ? input.refundedAt
            : input.refundAmount > 0
              ? new Date().toISOString()
              : null,
      })
      .eq("id", orderId);

    if (error) {
      throw error;
    }
  }

  async markOrderItemsRefunded(
    orderId: string,
    itemRefunds: Array<{ itemId: string; refundAmount: number }>,
    refundedAt = new Date().toISOString(),
  ): Promise<void> {
    const deduped = new Map<string, number>();
    itemRefunds.forEach((item) => {
      if (!item.itemId) {
        return;
      }
      deduped.set(item.itemId, item.refundAmount);
    });

    for (const [itemId, refundAmount] of deduped.entries()) {
      const { error } = await this.supabase
        .from("order_items")
        .update({
          refund_amount: refundAmount,
          refunded_at: refundedAt,
        })
        .eq("id", itemId)
        .eq("order_id", orderId);

      if (error) {
        throw error;
      }
    }
  }

  async restockVariants(
    variantAdjustments: Array<{ variantId: string; quantity: number }>,
  ): Promise<void> {
    const grouped = new Map<string, number>();
    variantAdjustments.forEach((entry) => {
      if (!entry.variantId || entry.quantity <= 0) {
        return;
      }
      grouped.set(entry.variantId, (grouped.get(entry.variantId) ?? 0) + entry.quantity);
    });

    for (const [variantId, quantity] of grouped.entries()) {
      const { error } = await this.supabase.rpc("increment_variant_stock", {
        p_variant_id: variantId,
        p_quantity: quantity,
      });

      if (error) {
        throw error;
      }
    }
  }

  async setFulfillmentStatus(orderId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({ fulfillment_status: status })
      .eq("id", orderId);

    if (error) {
      throw error;
    }
  }

  async markFulfilled(
    orderId: string,
    input: { carrier?: string | null; trackingNumber?: string | null },
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

    if (error) {
      throw error;
    }
    return data as OrderRow;
  }

  async markReadyToShip(
    orderId: string,
    input: {
      carrier?: string | null;
      trackingNumber?: string | null;
      labelUrl?: string | null;
      labelCreatedBy?: string | null;
      actualShippingCost?: number | null;
    },
  ): Promise<OrderRow> {
    const updateData: OrderUpdate = buildReadyToShipUpdate(input);

    const { data, error } = await this.supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data as OrderRow;
  }

  async updateFulfillment(
    orderId: string,
    fulfillment: "ship" | "pickup",
  ): Promise<void> {
    const { error } = await this.supabase
      .from("orders")
      .update({ fulfillment })
      .eq("id", orderId);

    if (error) {
      throw error;
    }
  }

  async getOrderWithTenant(orderId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(*),
        tenant_id
      `,
      )
      .eq("id", orderId)
      .single();

    if (error) {
      throw error;
    }
    return data;
  }
}
