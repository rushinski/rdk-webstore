// app/api/admin/orders/[orderId]/refund/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { OrdersRepository } from "@/repositories/orders-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ProductService } from "@/services/product-service";
import { OrderEmailService } from "@/services/order-email-service";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";

type OrderItemRefundCandidate = {
  id: string;
  line_total: number | string | null;
  quantity: number | string | null;
  variant_id: string | null;
  product_id: string;
  refunded_at?: string | null;
};

function getStripeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "raw" in error &&
    typeof (error as { raw?: { message?: string } }).raw?.message === "string"
  ) {
    return (error as { raw?: { message?: string } }).raw?.message ?? "";
  }
  return "";
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

const refundRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("full"),
  }),
  z.object({
    type: z.literal("product"),
    itemIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("custom"),
    amount: z.number().positive(),
  }),
]);

const toCents = (amount: number) => Math.max(0, Math.round(amount * 100));

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { orderId } = await params;

  try {
    await requireAdminApi();
    const body = await request.json().catch(() => ({}));
    const parsedBody = refundRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid refund payload",
          issues: parsedBody.error.format(),
          requestId,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const ordersRepo = new OrdersRepository(supabase);
    const profilesRepo = new ProfileRepository(supabase);

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

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "Cannot refund order: Missing payment information", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const tenantId = order.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Cannot refund: Tenant not found for order", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const stripeAccountId = await profilesRepo.getStripeAccountIdForTenant(tenantId);
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Cannot refund: Stripe Connect account not configured", requestId },
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
      stripeAccountId,
      paymentIntentId: order.stripe_payment_intent_id,
      refundType: payload.type,
      requestedRefundCents,
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.stripe_payment_intent_id,
      { expand: ["latest_charge"] },
      { stripeAccount: stripeAccountId },
    );
    const expandedCharge =
      paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== "string"
        ? paymentIntent.latest_charge
        : null;
    const hasApplicationFee =
      (expandedCharge?.application_fee !== null &&
        expandedCharge?.application_fee !== undefined) ||
      Number(expandedCharge?.application_fee_amount ?? 0) > 0;

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: order.stripe_payment_intent_id,
      amount: requestedRefundCents,
      reason: "requested_by_customer",
    };
    if (hasApplicationFee) {
      refundParams.refund_application_fee = true;
    }

    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create(refundParams, {
        stripeAccount: stripeAccountId,
      });
    } catch (refundError) {
      const errorMessage = getStripeErrorMessage(refundError).toLowerCase();
      const noAppFeeError =
        hasApplicationFee &&
        errorMessage.includes("refund_application_fee") &&
        errorMessage.includes("no application fee");

      if (!noAppFeeError) {
        throw refundError;
      }

      delete refundParams.refund_application_fee;
      refund = await stripe.refunds.create(refundParams, {
        stripeAccount: stripeAccountId,
      });
    }

    log({
      level: "info",
      layer: "api",
      message: "refund_request_submitted",
      requestId,
      orderId,
      refundType: payload.type,
      requestedRefundCents,
      refundApplicationFee: Boolean(refundParams.refund_application_fee),
    });

    if (refund.status === "failed") {
      throw new Error(`Stripe refund failed: ${refund.failure_reason}`);
    }

    const refundedCents = Math.max(
      0,
      Math.round(Number(refund.amount ?? requestedRefundCents)),
    );
    const nextRefundAmountCents = Math.min(
      orderTotalCents,
      existingRefundCents + refundedCents,
    );
    const isFullyRefunded = nextRefundAmountCents >= orderTotalCents;

    let nextStatus = order.status ?? "paid";
    if (refund.status === "pending") {
      nextStatus = "refund_pending";
    } else if (refund.status === "succeeded") {
      nextStatus = isFullyRefunded ? "refunded" : "partially_refunded";
    }

    await ordersRepo.updateRefundSummary(orderId, {
      status: nextStatus,
      refundAmount: nextRefundAmountCents,
      refundedAt: new Date().toISOString(),
    });

    let inventoryWarning: string | null = null;
    if (
      payload.type === "product" &&
      selectedItems.length > 0 &&
      refund.status !== "failed"
    ) {
      const refundScale =
        requestedRefundCents > 0 ? refundedCents / requestedRefundCents : 1;
      const itemRefundUpdates = selectedItems.map((item) => ({
        itemId: item.id,
        refundAmount: Math.round(toCents(Number(item.line_total ?? 0)) * refundScale),
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
            .filter((entry) => entry.quantity > 0),
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
          refundId: refund.id,
        });
      }
    }

    log({
      level: "info",
      layer: "api",
      message: "refund_completed",
      requestId,
      orderId,
      refundId: refund.id,
      amountCents: refundedCents,
      refundOrderStatus: nextStatus,
      refundType: payload.type,
    });

    try {
      const emailService = new OrderEmailService();
      if (order.user_id) {
        const profile = await profilesRepo.getByUserId(order.user_id);
        if (profile?.email) {
          await emailService.sendOrderRefunded({
            to: profile.email,
            orderId: order.id,
            refundAmount: refundedCents,
          });
        }
      } else if (order.guest_email) {
        await emailService.sendOrderRefunded({
          to: order.guest_email,
          orderId: order.id,
          refundAmount: refundedCents,
        });
      }
    } catch (emailError) {
      logError(emailError, {
        layer: "api",
        requestId,
        message: "refund_email_failed",
        orderId,
      });
    }

    return NextResponse.json(
      {
        success: true,
        refundId: refund.id,
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

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "raw" in error &&
            typeof (error as { raw?: { message?: string } }).raw?.message === "string"
          ? ((error as { raw?: { message?: string } }).raw?.message ??
            "Failed to process refund")
          : "Failed to process refund";

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
