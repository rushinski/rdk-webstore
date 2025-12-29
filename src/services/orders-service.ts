// src/services/orders-service.ts (NEW)

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders-repo";
import type { OrderStatusResponse } from "@/types/views/checkout";

export class OrdersService {
  private ordersRepo: OrdersRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.ordersRepo = new OrdersRepository(supabase);
  }

  async getOrderStatus(
    orderId: string,
    userId: string | null,
    publicToken: string | null
  ): Promise<OrderStatusResponse> {
    let order;

    if (userId) {
      order = await this.ordersRepo.getByIdAndUser(orderId, userId);
    } else if (publicToken) {
      order = await this.ordersRepo.getByIdAndToken(orderId, publicToken);
    } else {
      throw new Error("Unauthorized");
    }

    if (!order) {
      throw new Error("Order not found");
    }

    return {
      id: order.id,
      status: order.status ?? "pending",
      subtotal: parseFloat(order.subtotal?.toString() ?? "0"),
      shipping: parseFloat(order.shipping?.toString() ?? "0"),
      total: parseFloat(order.total?.toString() ?? "0"),
      fulfillment: order.fulfillment as "ship" | "pickup",
      updatedAt: order.updated_at?.toString() ?? order.created_at?.toString() ?? "",
    };
  }

  async listOrdersForUser(userId: string) {
    return this.ordersRepo.listOrdersForUser(userId);
  }

  async getOrderById(orderId: string) {
    return this.ordersRepo.getById(orderId);
  }

  async listOrders(params?: {
    status?: string[];
    fulfillment?: string;
    fulfillmentStatus?: string;
    limit?: number;
  }) {
    return this.ordersRepo.listOrders(params);
  }

  async markRefunded(orderId: string, amount: number) {
    return this.ordersRepo.markRefunded(orderId, amount);
  }

  async markFulfilled(
    orderId: string,
    input: { carrier?: string | null; trackingNumber?: string | null }
  ) {
    return this.ordersRepo.markFulfilled(orderId, input);
  }
}
