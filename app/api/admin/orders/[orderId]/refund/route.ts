// app/api/admin/orders/[orderId]/refund/route.ts
// Processes refunds via PayRilla. Handles full, product-level, and custom amount refunds.
// Uses reverseTransaction() which voids if unsettled or refunds if settled.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { PaymentTransactionsRepository } from "@/repositories/payment-transactions-repo";
import { PayrillaChargeService } from "@/services/payrilla-charge-service";
import { ProductService } from "@/services/product-service";
import { RefundNotificationService } from "@/services/refund-notification-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logCheckoutEvent } from "@/lib/checkout/log-checkout-event";
import { log, logError } from "@/lib/utils/log";

type OrderItemRefundCandidate = {
  id: string;
  line_total: number | string | null;
  quantity: number | string | null;
  variant_id: string | null;
  product_id: string;
  refunded_at?: string | null;
};

const refundRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("full") }),
  z.object({ type: z.literal("product"), itemIds: z.array(z.string().uuid()).min(1) }),
  z.object({ type: z.literal("custom"), amount: z.number().positive() }),
]);

const toCents = (amount: number) => Math.max(0, Math.round(amount * 100));

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const startedAt = Date.now();
  const { orderId } = await params;
  let requestBody: unknown = null;
  let tenantIdForLog: string | null = null;

  try {
    await requireAdminApi();
    const body = await request.json().catch(() => ({}));
    requestBody = body;
    const parsedBody = refundRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid refund payload", issues: parsedBody.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const ordersRepo = new OrdersRepository(supabase);
    const paymentTxRepo = new PaymentTransactionsRepository(admin);

    const order = await ordersRepo.getOrderWithTenant(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (order.status === "refunded") {
      return NextResponse.json(
        { error: "Order has already been fully refunded", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const currentStatus = order.status ?? "";
    const refundableStatuses = new Set([
      "paid",
      "shipped",
      "partially_refunded",
      "refund_failed",
      "refund_pending",
    ]);
    if (!refundableStatuses.has(currentStatus)) {
      return NextResponse.json(
        {
          error: `Order cannot be refunded while in status "${currentStatus || "unknown"}"`,
          requestId,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Resolve PayRilla reference number from payment_transactions
    const paymentTx = await paymentTxRepo.getByOrderId(orderId);
    const payrillaReferenceNumber =
      paymentTx !== null && paymentTx.payrilla_reference_number !== null
        ? String(paymentTx.payrilla_reference_number)
        : null;

    if (!payrillaReferenceNumber) {
      return NextResponse.json(
        {
          error: "Cannot refund: No PayRilla transaction found for this order",
          requestId,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const tenantId = order.tenant_id;
    tenantIdForLog = tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Cannot refund: Tenant not found for order", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const orderTotalCents = toCents(Number(order.total ?? 0));
    const existingRefundCents = Math.max(0, Math.round(Number(order.refund_amount ?? 0)));
    const remainingRefundableCents = Math.max(0, orderTotalCents - existingRefundCents);

    if (remainingRefundableCents <= 0) {
      return NextResponse.json(
        { error: "Order has no remaining refundable balance", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = parsedBody.data;
    const orderItems = (
      Array.isArray(order.items) ? order.items : []
    ) as OrderItemRefundCandidate[];
    let requestedRefundCents = remainingRefundableCents;
    let selectedItems: OrderItemRefundCandidate[] = [];

    if (payload.type === "custom") {
      requestedRefundCents = toCents(payload.amount);
    } else if (payload.type === "product") {
      const requestedItemIds = Array.from(new Set(payload.itemIds));
      selectedItems = orderItems.filter((item) => requestedItemIds.includes(item.id));
      if (selectedItems.length !== requestedItemIds.length) {
        return NextResponse.json(
          { error: "One or more selected products are invalid", requestId },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      const alreadyRefundedItem = selectedItems.find((item) => item.refunded_at);
      if (alreadyRefundedItem) {
        return NextResponse.json(
          { error: "One or more selected products were already refunded", requestId },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      requestedRefundCents = selectedItems.reduce(
        (sum, item) => sum + toCents(Number(item.line_total ?? 0)),
        0,
      );
    }

    if (requestedRefundCents <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than $0.00", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (requestedRefundCents > remainingRefundableCents) {
      return NextResponse.json(
        { error: "Refund amount exceeds remaining refundable balance", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    log({
      level: "info",
      layer: "api",
      message: "refund_initiated",
      requestId,
      orderId,
      tenantId,
      payrillaReferenceNumber,
      refundType: payload.type,
      requestedRefundCents,
    });

    // Issue the refund via PayRilla
    const payrillaService = new PayrillaChargeService(admin, tenantId);
    const isFullRefund = requestedRefundCents >= remainingRefundableCents;
    await payrillaService.reverseTransaction({
      transactionId: payrillaReferenceNumber,
      amountCents: isFullRefund ? undefined : requestedRefundCents,
    });

    const refundedCents = requestedRefundCents;
    const nextRefundAmountCents = Math.min(
      orderTotalCents,
      existingRefundCents + refundedCents,
    );
    const isFullyRefunded = nextRefundAmountCents >= orderTotalCents;
    const nextStatus = isFullyRefunded ? "refunded" : "partially_refunded";

    await ordersRepo.updateRefundSummary(orderId, {
      status: nextStatus,
      refundAmount: nextRefundAmountCents,
      refundedAt: new Date().toISOString(),
    });

    // Log refund event to payment_transactions
    try {
      if (paymentTx?.id) {
        await paymentTxRepo.update(paymentTx.id as string, {
          amountRefunded: nextRefundAmountCents / 100,
        });
        await paymentTxRepo.logEvent({
          paymentTransactionId: paymentTx.id as string,
          orderId,
          tenantId,
          eventType: isFullyRefunded ? "payment_refunded" : "payment_refund_partial",
          eventData: {
            refundType: payload.type,
            refundedCents,
            nextRefundAmountCents,
          },
        });
      }
    } catch {
      /* non-fatal */
    }

    let inventoryWarning: string | null = null;
    if (payload.type === "product" && selectedItems.length > 0) {
      const itemRefundUpdates = selectedItems.map((item) => ({
        itemId: item.id,
        refundAmount: toCents(Number(item.line_total ?? 0)),
      }));
      try {
        await ordersRepo.markOrderItemsRefunded(orderId, itemRefundUpdates);
        await ordersRepo.restockVariants(
          selectedItems
            .filter((item) => item.variant_id)
            .map((item) => ({
              variantId: item.variant_id as string,
              quantity: Math.max(0, Math.round(Number(item.quantity ?? 0))),
            }))
            .filter((e) => e.quantity > 0),
        );
        const productService = new ProductService(supabase);
        const touchedProductIds = Array.from(
          new Set(selectedItems.map((item) => item.product_id).filter(Boolean)),
        );
        for (const productId of touchedProductIds) {
          await productService.syncSizeTags(productId);
        }
      } catch (inventoryError) {
        inventoryWarning =
          "Refund completed, but product refund state could not be fully synced.";
        logError(inventoryError, {
          layer: "api",
          requestId,
          message: "refund_inventory_sync_failed",
          orderId,
        });
      }
    }

    log({
      level: "info",
      layer: "api",
      message: "refund_completed",
      requestId,
      orderId,
      amountCents: refundedCents,
      refundOrderStatus: nextStatus,
      refundType: payload.type,
    });

    // Send refund email
    try {
      const refundNotificationService = new RefundNotificationService(admin);
      await refundNotificationService.sendRefundNotification({
        order,
        refundAmountCents: refundedCents,
        cumulativeRefundCents: nextRefundAmountCents,
        requestId,
      });
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        message: "refund_email_failed",
        orderId,
      });
    }

    void logCheckoutEvent(admin, {
      orderId,
      tenantId: tenantIdForLog,
      requestId,
      route: `/api/admin/orders/${orderId}/refund`,
      method: "POST",
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
      eventLabel: `Refund processed (${payload.type})`,
      requestPayload: requestBody,
      responsePayload: {
        success: true,
        status: nextStatus,
        refundAmount: nextRefundAmountCents,
        warning: inventoryWarning,
        requestId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status: nextStatus,
        refundAmount: nextRefundAmountCents,
        warning: inventoryWarning,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: `/api/admin/orders/${orderId}/refund`,
      message: "refund_failed",
    });
    const admin = createSupabaseAdminClient();
    void logCheckoutEvent(admin, {
      orderId,
      tenantId: tenantIdForLog,
      requestId,
      route: `/api/admin/orders/${orderId}/refund`,
      method: "POST",
      httpStatus: 500,
      durationMs: Date.now() - startedAt,
      eventLabel: "Refund failed",
      errorMessage: "REFUND_FAILED",
      requestPayload: requestBody,
      responsePayload: {
        error: error instanceof Error ? error.message : "Failed to process refund",
        requestId,
      },
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process refund",
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
