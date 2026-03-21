// app/api/checkout/create-checkout/route.ts
//
// PayRilla checkout endpoint. Replaces /api/checkout/create-payment-intent.
//
// Flow:
//   1. Frontend loads PayRilla Hosted Tokenization with the tenant's tokenization key
//   2. Customer fills card form; frontend calls hostedTokenization.getNonceToken()
//      → { nonce, expiryMonth, expiryYear, avsZip, ... }
//   3. Frontend POSTs { items, fulfillment, nonce, expiryMonth, expiryYear, ... } here
//   4. We create/find the order, calculate pricing, charge via PayRilla
//   5. On success: order marked paid immediately; webhook confirms as backup
//   6. On failure: return { error, code } to the frontend

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { OrdersRepository } from "@/repositories/orders-repo";
import {
  CheckoutPricingService,
  CheckoutError,
} from "@/services/checkout-pricing-service";
import { PayrillaChargeService } from "@/services/payrilla-charge-service";
import { NoFraudService, type NoFraudResult } from "@/services/nofraud-service";
import { EvidenceService } from "@/services/evidence-service";
import { NexusRepository } from "@/repositories/nexus-repo";
import { ProductService } from "@/services/product-service";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { createCartHash } from "@/lib/utils/crypto";
import { createCheckoutSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    if (!userId && env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED !== "true") {
      return json(
        { error: "GUEST_CHECKOUT_DISABLED", code: "GUEST_CHECKOUT_DISABLED", requestId },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createCheckoutSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        400,
      );
    }

    const {
      items,
      fulfillment,
      idempotencyKey,
      guestEmail,
      shippingAddress,
      billingAddress,
      nonce,
      expiryMonth,
      expiryYear,
      avsZip,
      cardholderName,
      walletType,
      walletToken,
      nfToken,
    } = parsed.data;

    const isWalletPayment = walletType !== null && walletToken !== null;

    const adminSupabase = createSupabaseAdminClient();
    const ordersRepo = new OrdersRepository(userId ? supabase : adminSupabase);
    const cartHash = createCartHash(items, fulfillment);

    // ---------- Idempotency ----------
    const existingOrder = await ordersRepo.getByIdempotencyKey(idempotencyKey);

    if (existingOrder) {
      const expiresAt = existingOrder.expires_at
        ? new Date(existingOrder.expires_at)
        : null;
      if (expiresAt && expiresAt < new Date()) {
        return json(
          {
            error: "IDEMPOTENCY_KEY_EXPIRED",
            code: "IDEMPOTENCY_KEY_EXPIRED",
            requestId,
          },
          409,
        );
      }
      if (existingOrder.cart_hash !== cartHash) {
        return json({ error: "CART_MISMATCH", code: "CART_MISMATCH", requestId }, 409);
      }
      if (existingOrder.status === "paid") {
        return json({ status: "paid", orderId: existingOrder.id, requestId }, 200);
      }
      if (!existingOrder.user_id && guestEmail && !existingOrder.guest_email) {
        await ordersRepo.updateGuestEmail(existingOrder.id, guestEmail);
      }
    }

    // ---------- Pricing ----------
    const pricingService = new CheckoutPricingService(adminSupabase);
    let resolved;
    try {
      resolved = await pricingService.resolve({ items, fulfillment, shippingAddress });
    } catch (err) {
      if (err instanceof CheckoutError) {
        return json({ error: err.message, code: err.code, requestId }, 400);
      }
      throw err;
    }
    const { tenantId, lineItems, pricing } = resolved;

    // ---------- Create pending order ----------
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const order =
      existingOrder ??
      (await ordersRepo.createPendingOrder({
        userId,
        guestEmail: guestEmail ?? null,
        tenantId,
        currency: "USD",
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        total: pricing.total,
        fulfillment,
        idempotencyKey,
        cartHash,
        expiresAt,
        items: lineItems.map((li) => ({
          productId: li.productId,
          variantId: li.variantId,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          unitCost: li.unitCost,
          lineTotal: li.lineTotal,
        })),
      }));

    // Save tax info
    await adminSupabase
      .from("orders")
      .update({
        tax_amount: pricing.tax,
        tax_calculation_id: pricing.taxCalculationId,
        customer_state: pricing.customerState,
      })
      .eq("id", order.id);

    const totalCents = Math.round(pricing.total * 100);
    const customerIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const payrillaService = new PayrillaChargeService(adminSupabase, tenantId);
    let chargeResult;
    let nofraudResult: NoFraudResult | null = null;

    if (isWalletPayment) {
      // ---- Wallet flow: single-step immediate capture ----
      // Apple Pay / Google Pay tokens are encrypted by the device and captured
      // in one step. If NoFraud fails, we issue a refund instead of a void.
      try {
        chargeResult = await payrillaService.createWalletTransaction({
          walletType: walletType!,
          walletToken: walletToken!,
          amountCents: totalCents,
          orderId: order.id,
          customerIp,
        });
      } catch (err) {
        logError(err, {
          layer: "api",
          requestId,
          orderId: order.id,
          event: "payrilla_wallet_charge_failed",
        });
        return json(
          { error: "Payment processing failed", code: "PAYMENT_FAILED", requestId },
          402,
        );
      }

      if (chargeResult.status !== "approved") {
        return json(
          {
            error:
              chargeResult.status === "declined" ? "Payment declined" : "Payment error",
            code:
              chargeResult.status === "declined" ? "PAYMENT_DECLINED" : "PAYMENT_ERROR",
            requestId,
          },
          402,
        );
      }

      // NoFraud screening after capture — refund if flagged as fraud
      const nofraud = new NoFraudService();
      nofraudResult = await nofraud.screenTransaction({
        nfToken: nfToken ?? null,
        amount: (totalCents / 100).toFixed(2),
        shippingAmount: pricing.shipping.toFixed(2),
        customerIP: customerIp ?? "",
        email: guestEmail ?? "",
        avsResultCode: "",
        cvvResultCode: "",
        gatewayName: "PayRilla",
        gatewayStatus: "approved",
        invoiceNumber: order.id,
      });

      if (nofraudResult.ok && nofraudResult.response.decision === "fail") {
        try {
          await payrillaService.reverseTransaction({
            transactionId: chargeResult.transactionId,
          });
        } catch {
          /* best-effort */
        }
        log({
          level: "warn",
          layer: "api",
          message: "nofraud_fail_order_blocked",
          requestId,
          orderId: order.id,
        });
        await adminSupabase
          .from("orders")
          .update({ status: "failed" })
          .eq("id", order.id);
        return json(
          { error: "Order could not be processed", code: "FRAUD_BLOCKED", requestId },
          402,
        );
      }

      if (nofraudResult.ok && nofraudResult.response.decision === "review") {
        await adminSupabase
          .from("orders")
          .update({ status: "review" })
          .eq("id", order.id);
      }
    } else {
      // ---- Card flow: auth-only → NoFraud → capture ----
      // Auth-only ensures nothing appears on the customer's statement until
      // fraud screening passes. If NoFraud rejects the order, we void the
      // authorization — the customer never sees a charge.
      let authResult;
      try {
        authResult = await payrillaService.createTransaction({
          nonce: nonce!,
          amountCents: totalCents,
          expiryMonth: expiryMonth!,
          expiryYear: expiryYear!,
          avsZip: avsZip ?? shippingAddress?.postal_code ?? null,
          avsAddress: billingAddress?.line1 ?? shippingAddress?.line1 ?? null,
          cardholderName: cardholderName ?? null,
          orderId: order.id,
          customerIp,
        });
      } catch (err) {
        logError(err, {
          layer: "api",
          requestId,
          orderId: order.id,
          event: "payrilla_auth_failed",
        });
        return json(
          { error: "Payment processing failed", code: "PAYMENT_FAILED", requestId },
          402,
        );
      }

      if (authResult.status !== "approved") {
        return json(
          {
            error: authResult.status === "declined" ? "Card declined" : "Payment error",
            code: authResult.status === "declined" ? "CARD_DECLINED" : "PAYMENT_ERROR",
            requestId,
          },
          402,
        );
      }

      // NoFraud screening — AVS/CVV codes from authorization required by NoFraud
      const nofraud = new NoFraudService();
      nofraudResult = await nofraud.screenTransaction({
        nfToken: nfToken ?? null,
        amount: (totalCents / 100).toFixed(2),
        shippingAmount: pricing.shipping.toFixed(2),
        customerIP: customerIp ?? "",
        email: guestEmail ?? "",
        avsResultCode: authResult.avsResultCode ?? "",
        cvvResultCode: authResult.cvvResultCode ?? "",
        gatewayName: "PayRilla",
        gatewayStatus: "approved",
        invoiceNumber: order.id,
      });

      if (nofraudResult.ok && nofraudResult.response.decision === "fail") {
        try {
          await payrillaService.voidTransaction(authResult.transactionId);
        } catch {
          /* best-effort — authorization will expire on its own if void fails */
        }
        log({
          level: "warn",
          layer: "api",
          message: "nofraud_fail_order_blocked",
          requestId,
          orderId: order.id,
        });
        await adminSupabase
          .from("orders")
          .update({ status: "failed" })
          .eq("id", order.id);
        return json(
          { error: "Order could not be processed", code: "FRAUD_BLOCKED", requestId },
          402,
        );
      }

      try {
        await payrillaService.captureTransaction(authResult.transactionId);
      } catch (err) {
        logError(err, {
          layer: "api",
          requestId,
          orderId: order.id,
          event: "payrilla_capture_failed",
        });
        return json(
          { error: "Payment capture failed", code: "CAPTURE_FAILED", requestId },
          402,
        );
      }

      if (nofraudResult.ok && nofraudResult.response.decision === "review") {
        await adminSupabase
          .from("orders")
          .update({ status: "review" })
          .eq("id", order.id);
      }

      chargeResult = authResult;
    }

    // ---------- Mark paid ----------
    const orderItems = await ordersRepo.getOrderItems(order.id);
    let didMarkPaid = false;
    try {
      didMarkPaid = await ordersRepo.markPaidTransactionally(
        order.id,
        chargeResult.transactionId,
        orderItems.map((i) => ({
          productId: i.product_id,
          variantId: i.variant_id,
          quantity: i.quantity,
        })),
      );
    } catch {
      // Fallback
      const { data: fallback } = await adminSupabase
        .from("orders")
        .update({ status: "paid", payment_transaction_id: chargeResult.transactionId })
        .eq("id", order.id)
        .in("status", ["pending", "processing"])
        .select("id")
        .maybeSingle();
      didMarkPaid = Boolean(fallback);
    }

    if (didMarkPaid) {
      // Sync size tags
      const productService = new ProductService(adminSupabase);
      const productIds = [...new Set(orderItems.map((i) => i.product_id))];
      for (const pid of productIds) {
        await productService.syncSizeTags(pid);
      }

      // Nexus tracking
      if (pricing.customerState) {
        try {
          const nexusRepo = new NexusRepository(adminSupabase);
          await nexusRepo.recordSale({
            tenantId,
            stateCode: pricing.customerState,
            orderTotal: pricing.total,
            taxAmount: pricing.tax,
            isTaxable: pricing.tax > 0,
          });
        } catch {
          /* non-fatal */
        }
      }

      // Chargeback evidence
      try {
        const evidenceService = new EvidenceService(adminSupabase);
        const nofraudResponse = nofraudResult?.ok ? nofraudResult.response : null;
        await evidenceService.collectPaymentEvidence({
          orderId: order.id,
          tenantId,
          paymentTransactionId: chargeResult.transactionId,
          paymentAmount: totalCents / 100,
          paymentCurrency: "USD",
          paymentMethodLast4: chargeResult.last4,
          paymentMethodType: chargeResult.cardType,
          avsResultCode: chargeResult.avsResultCode,
          cvvResultCode: chargeResult.cvvResultCode,
          nofraudTransactionId: nofraudResponse?.id ?? null,
          nofraudDecision: nofraudResponse?.decision ?? null,
          customerIp,
        });
      } catch {
        /* non-fatal */
      }

      // Order event
      const orderEventsRepo = new OrderEventsRepository(adminSupabase);
      await orderEventsRepo.insertEvent({
        orderId: order.id,
        type: "paid",
        message: "Payment approved via PayRilla.",
      });

      // Cache revalidation
      try {
        const { revalidateTag } = await import("next/cache");
        for (const item of orderItems) {
          revalidateTag(`product:${item.product_id}`, "max");
        }
        revalidateTag("products:list", "max");
      } catch {
        /* non-fatal */
      }
    }

    log({
      level: "info",
      layer: "api",
      message: "checkout_completed",
      requestId,
      orderId: order.id,
      transactionId: chargeResult.transactionId,
      totalCents,
      nofraudDecision: nofraudResult?.ok ? nofraudResult.response.decision : "skipped",
    });

    return json(
      {
        status: "paid",
        orderId: order.id,
        transactionId: chargeResult.transactionId,
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: pricing.tax,
        total: pricing.total,
        fulfillment,
        requestId,
      },
      200,
    );
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/checkout/create-checkout" });

    if (error instanceof CheckoutError) {
      return json({ error: error.message, code: error.code, requestId }, 400);
    }

    return json({ error: "Internal server error", requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
