import { env } from "@/config/env";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { log } from "@/lib/utils/log";
import { AddressesRepository } from "@/repositories/addresses-repo";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { AdminOrderEmailService } from "@/services/admin-order-email-service";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { OrderEmailService } from "@/services/order-email-service";
import type { Tables } from "@/types/db/database.types";

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;

const PLACEHOLDER_EMAIL_DOMAIN = "@placeholder.local";

export async function sendOrderCompletionEmailsIfNeeded(params: {
  order: OrderRow;
  orderId: string;
  orderItems: OrderItemRow[];
  fulfillment: "ship" | "pickup";
  adminSupabase: AdminSupabaseClient;
  requestId: string;
  logLayer: "api" | "payrilla";
}) {
  try {
    const ordersRepo = new OrdersRepository(params.adminSupabase);
    const orderEventsRepo = new OrderEventsRepository(params.adminSupabase);
    const profilesRepo = new ProfileRepository(params.adminSupabase);
    const addressesRepo = new AddressesRepository(params.adminSupabase);
    const orderAccessTokens = new OrderAccessTokenService(params.adminSupabase);
    const orderEmailService = new OrderEmailService(
      params.adminSupabase,
      params.order.tenant_id,
    );

    const freshOrder = await ordersRepo.getById(params.orderId);
    const resolvedOrder = freshOrder ?? params.order;

    let email: string | null = null;
    if (resolvedOrder.user_id) {
      const profile = await profilesRepo.getByUserId(resolvedOrder.user_id);
      email = profile?.email ?? null;
    }
    if (!email) {
      email = resolvedOrder.guest_email ?? null;
    }
    if (email?.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) {
      email = null;
    }

    if (!email) {
      log({
        level: "warn",
        layer: params.logLayer,
        message: "order_completion_email_not_found_skipping",
        requestId: params.requestId,
        orderId: params.orderId,
      });
      return;
    }

    let orderUrl: string | null = null;
    if (!resolvedOrder.user_id) {
      const { token } = await orderAccessTokens.createToken({ orderId: params.orderId });
      orderUrl = `${env.NEXT_PUBLIC_SITE_URL}/order-status/${params.orderId}?token=${encodeURIComponent(token)}`;
    }

    const detailedItems = await ordersRepo.getOrderItemsDetailed(params.orderId);
    const items = (
      detailedItems as Array<{
        product: {
          title_display?: string | null;
          brand?: string | null;
          name?: string | null;
        } | null;
        variant: { size_label?: string | null } | null;
        quantity: number;
        unit_price: number | null;
        line_total: number;
      }>
    ).map((item) => {
      const product = item.product;
      const title =
        product?.title_display ??
        (`${product?.brand ?? ""} ${product?.name ?? ""}`.trim() || "Item");
      return {
        title,
        sizeLabel: item.variant?.size_label ?? null,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      };
    });

    const shippingSnapshot =
      params.fulfillment === "ship"
        ? await addressesRepo.getOrderShipping(params.orderId)
        : null;

    const hasConfirmation = await orderEventsRepo.hasEvent(
      params.orderId,
      "confirmation_email_sent",
    );
    if (!hasConfirmation) {
      await orderEmailService.sendOrderConfirmation({
        to: email,
        orderId: params.orderId,
        createdAt: resolvedOrder.created_at ?? new Date().toISOString(),
        fulfillment: params.fulfillment,
        currency: resolvedOrder.currency ?? "USD",
        subtotal: Number(resolvedOrder.subtotal ?? 0),
        shipping: Number(resolvedOrder.shipping ?? 0),
        tax: Number(resolvedOrder.tax_amount ?? 0),
        total: Number(resolvedOrder.total ?? 0),
        items,
        orderUrl,
        shippingAddress: shippingSnapshot
          ? {
              name: shippingSnapshot.name,
              line1: shippingSnapshot.line1,
              line2: shippingSnapshot.line2,
              city: shippingSnapshot.city,
              state: shippingSnapshot.state,
              postalCode: shippingSnapshot.postal_code,
              country: shippingSnapshot.country,
            }
          : null,
      });
      await orderEventsRepo.insertEvent({
        orderId: params.orderId,
        type: "confirmation_email_sent",
        message: "Confirmation emailed.",
      });
    }

    if (params.fulfillment === "pickup") {
      const hasPickup = await orderEventsRepo.hasEvent(
        params.orderId,
        "pickup_instructions_sent",
      );
      if (!hasPickup) {
        await orderEmailService.sendPickupInstructions({
          to: email,
          orderId: params.orderId,
          orderUrl,
        });
        await orderEventsRepo.insertEvent({
          orderId: params.orderId,
          type: "pickup_instructions_sent",
          message: "Pickup instructions emailed.",
        });
      }
    }

    const hasAdminEmail = await orderEventsRepo.hasEvent(
      params.orderId,
      "admin_order_email_sent",
    );
    if (!hasAdminEmail) {
      const staff = await profilesRepo.listStaffProfiles();
      const recipients = staff.filter(
        (profile) => profile.admin_order_notifications_enabled !== false && profile.email,
      );
      if (recipients.length > 0) {
        const adminEmailService = new AdminOrderEmailService();
        const itemCount = params.orderItems.reduce(
          (sum, item) => sum + Number(item.quantity ?? 0),
          0,
        );
        await Promise.all(
          recipients.map((admin) =>
            adminEmailService.sendOrderPlaced({
              to: admin.email ?? "",
              orderId: params.orderId,
              fulfillment: params.fulfillment,
              subtotal: Number(resolvedOrder.subtotal ?? 0),
              shipping: Number(resolvedOrder.shipping ?? 0),
              tax: Number(resolvedOrder.tax_amount ?? 0),
              total: Number(resolvedOrder.total ?? 0),
              itemCount,
              customerEmail: email,
            }),
          ),
        );
        await orderEventsRepo.insertEvent({
          orderId: params.orderId,
          type: "admin_order_email_sent",
          message: "Admin notified.",
        });
      }
    }
  } catch (error) {
    log({
      level: "warn",
      layer: params.logLayer,
      message: "order_completion_email_failed",
      requestId: params.requestId,
      orderId: params.orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
