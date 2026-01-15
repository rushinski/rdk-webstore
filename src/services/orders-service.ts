// src/services/orders-service.ts

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { OrdersRepository } from "@/repositories/orders-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import type { OrderStatusResponse } from "@/types/domain/checkout";
import { env } from "@/config/env";
import { PICKUP_INSTRUCTIONS } from "@/config/pickup";

export class OrdersService {
  private ordersRepo: OrdersRepository;
  private orderEventsRepo: OrderEventsRepository;
  private adminOrdersRepo: OrdersRepository | null;
  private adminEventsRepo: OrderEventsRepository | null;
  private orderAccessTokens: OrderAccessTokenService | null;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    private readonly adminSupabase?: AdminSupabaseClient,
  ) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.orderEventsRepo = new OrderEventsRepository(supabase);
    this.adminOrdersRepo = adminSupabase ? new OrdersRepository(adminSupabase) : null;
    this.adminEventsRepo = adminSupabase
      ? new OrderEventsRepository(adminSupabase)
      : null;
    this.orderAccessTokens = adminSupabase
      ? new OrderAccessTokenService(adminSupabase)
      : null;
  }

  async getOrderStatus(
    orderId: string,
    userId: string | null,
    accessToken: string | null,
  ): Promise<OrderStatusResponse> {
    let order = null;
    let events = [];

    if (userId) {
      order = await this.ordersRepo.getByIdAndUser(orderId, userId);
      events = await this.orderEventsRepo.listByOrderId(orderId);
    } else if (
      accessToken &&
      this.adminOrdersRepo &&
      this.adminEventsRepo &&
      this.orderAccessTokens
    ) {
      const token = await this.orderAccessTokens.verifyToken({
        orderId,
        token: accessToken,
      });
      if (!token) {
        throw new Error("Unauthorized");
      }
      order = await this.adminOrdersRepo.getById(orderId);
      events = await this.adminEventsRepo.listByOrderId(orderId);
    } else {
      throw new Error("Unauthorized");
    }

    if (!order) {
      throw new Error("Order not found");
    }

    const pickupInstructions =
      order.fulfillment === "pickup"
        ? (order.pickup_instructions ?? PICKUP_INSTRUCTIONS.join("\n"))
        : null;

    return {
      id: order.id,
      status: order.status ?? "pending",
      subtotal: parseFloat(order.subtotal?.toString() ?? "0"),
      shipping: parseFloat(order.shipping?.toString() ?? "0"),
      total: parseFloat(order.total?.toString() ?? "0"),
      fulfillment: order.fulfillment as "ship" | "pickup",
      updatedAt: order.updated_at?.toString() ?? order.created_at?.toString() ?? "",
      events: events.map((event: any) => ({
        type: event.type,
        message: event.message ?? null,
        createdAt: event.created_at,
      })),
      pickupInstructions,
      supportEmail: env.SUPPORT_INBOX_EMAIL,
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

  async listOrdersPaged(params?: {
    status?: string[];
    fulfillment?: string;
    fulfillmentStatus?: string;
    limit?: number;
    page?: number;
  }) {
    return this.ordersRepo.listOrdersPaged(params);
  }

  async markRefunded(orderId: string, amount: number) {
    return this.ordersRepo.markRefunded(orderId, amount);
  }

  async markFulfilled(
    orderId: string,
    input: { carrier?: string | null; trackingNumber?: string | null },
  ) {
    return this.ordersRepo.markFulfilled(orderId, input);
  }
}
