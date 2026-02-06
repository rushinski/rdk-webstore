// src/services/orders-service.ts
// DEBUGGING VERSION - Heavily instrumented with logs

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import type { OrderStatusResponse } from "@/types/domain/checkout";
import { env } from "@/config/env";
import { PICKUP_INSTRUCTIONS } from "@/config/pickup";
import { log } from "@/lib/utils/log";

interface OrderEvent {
  type: string;
  message: string | null;
  created_at: string;
}

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
    log({
      level: "info",
      layer: "service",
      message: "getOrderStatus_called",
      orderId,
      hasUserId: Boolean(userId),
      hasAccessToken: Boolean(accessToken),
      accessTokenLength: accessToken?.length,
    });

    let order = null;
    let events: OrderEvent[] = [];

    // Case 1: Authenticated user
    if (userId) {
      log({
        level: "info",
        layer: "service",
        message: "getOrderStatus_checking_user_order",
        orderId,
        userId,
      });

      try {
        order = await this.ordersRepo.getByIdAndUser(orderId, userId);
        log({
          level: "info",
          layer: "service",
          message: "getOrderStatus_user_order_result",
          orderId,
          userId,
          foundOrder: Boolean(order),
          orderUserId: order?.user_id,
          orderStatus: order?.status,
          hasGuestEmail: Boolean(order?.guest_email),
        });

        if (order) {
          events = await this.orderEventsRepo.listByOrderId(orderId);
          log({
            level: "info",
            layer: "service",
            message: "getOrderStatus_user_order_success",
            orderId,
            userId,
            eventCount: events.length,
          });
          
          // Found order - return it
          return this.buildResponse(order, events);
        }
      } catch (error) {
        log({
          level: "error",
          layer: "service",
          message: "getOrderStatus_user_order_error",
          orderId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Case 2: Guest order with token OR authenticated user accessing guest order
    if (!order && accessToken) {
      log({
        level: "info",
        layer: "service",
        message: "getOrderStatus_checking_token",
        orderId,
        hasAccessToken: Boolean(accessToken),
        hasAdminRepo: Boolean(this.adminOrdersRepo),
        hasTokenService: Boolean(this.orderAccessTokens),
      });

      if (!this.adminOrdersRepo || !this.adminEventsRepo || !this.orderAccessTokens) {
        log({
          level: "error",
          layer: "service",
          message: "getOrderStatus_missing_admin_dependencies",
          orderId,
          hasAdminOrdersRepo: Boolean(this.adminOrdersRepo),
          hasAdminEventsRepo: Boolean(this.adminEventsRepo),
          hasTokenService: Boolean(this.orderAccessTokens),
        });
        throw new Error("Unauthorized");
      }

      try {
        // Verify token
        log({
          level: "info",
          layer: "service",
          message: "getOrderStatus_verifying_token",
          orderId,
          tokenLength: accessToken.length,
        });

        const tokenRecord = await this.orderAccessTokens.verifyToken({
          orderId,
          token: accessToken,
        });

        log({
          level: "info",
          layer: "service",
          message: "getOrderStatus_token_verified",
          orderId,
          tokenValid: Boolean(tokenRecord),
          tokenId: tokenRecord?.id,
          tokenOrderId: tokenRecord?.order_id,
          tokenExpiresAt: tokenRecord?.expires_at,
        });

        if (!tokenRecord) {
          log({
            level: "warn",
            layer: "service",
            message: "getOrderStatus_invalid_token",
            orderId,
            tokenLength: accessToken.length,
          });
          
          // Check if ANY token exists for this order
          try {
            const allTokens = await this.orderAccessTokens.listTokenMetadata(orderId);

            log({
              level: "info",
              layer: "service",
              message: "getOrderStatus_all_tokens_for_order",
              orderId,
              tokenCount: allTokens.length,
              tokens: allTokens.map((t) => ({
                id: t.id,
                created: t.created_at,
                expires: t.expires_at,
                lastUsed: t.last_used_at,
              })),
            });
          } catch (debugError) {
            log({
              level: "error",
              layer: "service",
              message: "getOrderStatus_debug_tokens_error",
              orderId,
              error: debugError instanceof Error ? debugError.message : String(debugError),
            });
          }
          
          throw new Error("Unauthorized");
        }

        // Token is valid - fetch order
        log({
          level: "info",
          layer: "service",
          message: "getOrderStatus_fetching_guest_order",
          orderId,
          tokenOrderId: tokenRecord.order_id,
        });

        order = await this.adminOrdersRepo.getById(orderId);

        log({
          level: "info",
          layer: "service",
          message: "getOrderStatus_guest_order_result",
          orderId,
          foundOrder: Boolean(order),
          orderUserId: order?.user_id,
          orderStatus: order?.status,
          hasGuestEmail: Boolean(order?.guest_email),
        });

        if (order) {
          events = await this.adminEventsRepo.listByOrderId(orderId);
          log({
            level: "info",
            layer: "service",
            message: "getOrderStatus_guest_order_success",
            orderId,
            eventCount: events.length,
          });
          
          return this.buildResponse(order, events);
        }
      } catch (error) {
        log({
          level: "error",
          layer: "service",
          message: "getOrderStatus_token_flow_error",
          orderId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }

    // Case 3: No valid auth method
    log({
      level: "error",
      layer: "service",
      message: "getOrderStatus_no_auth_method",
      orderId,
      hasUserId: Boolean(userId),
      hasAccessToken: Boolean(accessToken),
      foundOrder: Boolean(order),
    });

    // Check if order exists at all (for debugging)
    if (this.adminOrdersRepo) {
      try {
        const debugOrder = await this.adminOrdersRepo.getById(orderId);
        log({
          level: "info",
          layer: "service",
          message: "getOrderStatus_order_exists_check",
          orderId,
          orderExists: Boolean(debugOrder),
          orderUserId: debugOrder?.user_id,
          orderStatus: debugOrder?.status,
          hasGuestEmail: Boolean(debugOrder?.guest_email),
          guestEmail: debugOrder?.guest_email,
        });
      } catch (debugError) {
        log({
          level: "error",
          layer: "service",
          message: "getOrderStatus_debug_order_error",
          orderId,
          error: debugError instanceof Error ? debugError.message : String(debugError),
        });
      }
    }

    throw new Error("Unauthorized");
  }

  private buildResponse(order: any, events: OrderEvent[]): OrderStatusResponse {
    const pickupInstructions =
      order.fulfillment === "pickup"
        ? (order.pickup_instructions ?? PICKUP_INSTRUCTIONS.join("\n"))
        : null;

    return {
      id: order.id,
      status: order.status ?? "pending",
      subtotal: parseFloat(order.subtotal?.toString() ?? "0"),
      shipping: parseFloat(order.shipping?.toString() ?? "0"),
      tax: parseFloat(order.tax_amount?.toString() ?? "0"),
      total: parseFloat(order.total?.toString() ?? "0"),
      fulfillment: order.fulfillment as "ship" | "pickup",
      updatedAt: order.updated_at?.toString() ?? order.created_at?.toString() ?? "",
      events: events.map((event) => ({
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
