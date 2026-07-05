import { env } from "@/config/env";
import { PICKUP_INSTRUCTIONS } from "@/config/pickup";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { log } from "@/lib/utils/log";
import type { OrderEventsRepository } from "@/modules/orders/infrastructure/order-events-repo";
import type { OrdersRepository } from "@/modules/orders/infrastructure/orders-repo";
import type { OrderStatusResponse } from "@/types/domain/checkout";
import type { Tables } from "@/types/db/database.types";

interface OrderEvent {
  type: string;
  message: string | null;
  created_at: string;
}

type OrderRow = Tables<"orders">;

type CapturedPaymentSnapshot = {
  paymentStatus: string | null;
  processorReference: number | null;
};

export function normalizeCapturedPaymentSnapshot(
  input:
    | {
        paymentStatus?: string | null;
        processorReference?: number | null;
      }
    | undefined,
): CapturedPaymentSnapshot | null {
  if (!input) {
    return null;
  }

  return {
    paymentStatus: input.paymentStatus ?? null,
    processorReference: input.processorReference ?? null,
  };
}

export function buildOrderStatusResponse(
  order: OrderRow,
  events: OrderEvent[],
): OrderStatusResponse {
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

export async function reconcileCapturedOrderPayment({
  adminEventsRepo,
  adminOrdersRepo,
  adminSupabase,
  order,
}: {
  adminEventsRepo: OrderEventsRepository | null;
  adminOrdersRepo: OrdersRepository | null;
  adminSupabase?: AdminSupabaseClient;
  order: OrderRow;
}): Promise<OrderRow> {
  if (!adminSupabase || !adminOrdersRepo || !adminEventsRepo) {
    return order;
  }

  if (!["failed", "pending", "processing"].includes(order.status ?? "")) {
    return order;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paymentTxRows } = await (adminSupabase as any)
      .from("payment_transactions")
      .select("paymentStatus:payment_status, processorReference:processor_reference")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestTx = normalizeCapturedPaymentSnapshot(
      paymentTxRows?.[0] as
        | { paymentStatus?: string | null; processorReference?: number | null }
        | undefined,
    );

    if (
      latestTx?.paymentStatus !== "captured" ||
      latestTx.processorReference === null ||
      latestTx.processorReference === undefined
    ) {
      return order;
    }

    log({
      level: "warn",
      layer: "service",
      message: "getOrderStatus_reconciling_captured_payment",
      orderId: order.id,
      orderStatus: order.status,
      referenceNumber: latestTx.processorReference,
    });

    if (order.status === "failed") {
      await adminOrdersRepo.resetFailedOrderForRetry(
        order.id,
        new Date(Date.now() + 60 * 60 * 1000),
      );
    }

    const orderItems = await adminOrdersRepo.getOrderItems(order.id);
    let didMarkPaid = false;

    try {
      didMarkPaid = await adminOrdersRepo.markPaidTransactionally(
        order.id,
        String(latestTx.processorReference),
        orderItems.map((item) => ({
          productId: item.product_id,
          variantId: item.variant_id,
          quantity: item.quantity,
        })),
      );
    } catch (error) {
      log({
        level: "error",
        layer: "service",
        message: "getOrderStatus_reconcile_mark_paid_failed",
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!didMarkPaid) {
      const { data: fallbackRow, error: fallbackError } = await adminSupabase
        .from("orders")
        .update({
          status: "paid",
          payment_transaction_id: String(latestTx.processorReference),
          failure_reason: null,
        })
        .eq("id", order.id)
        .in("status", ["pending", "processing", "failed"])
        .select("id")
        .maybeSingle();

      if (fallbackError) {
        log({
          level: "error",
          layer: "service",
          message: "getOrderStatus_reconcile_fallback_failed",
          orderId: order.id,
          error: fallbackError.message,
        });
      } else {
        didMarkPaid = Boolean(fallbackRow);
      }
    }

    if (didMarkPaid) {
      const hasPaidEvent = await adminEventsRepo.hasEvent(order.id, "paid");
      if (!hasPaidEvent) {
        await adminEventsRepo.insertEvent({
          orderId: order.id,
          type: "paid",
          message: "Recovered after captured payment was detected.",
        });
      }

      const refreshedOrder = await adminOrdersRepo.getById(order.id);
      if (refreshedOrder) {
        return refreshedOrder;
      }
    }
  } catch (error) {
    log({
      level: "error",
      layer: "service",
      message: "getOrderStatus_reconcile_error",
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return order;
}
