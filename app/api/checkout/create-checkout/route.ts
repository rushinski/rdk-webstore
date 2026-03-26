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
import { logCheckoutEvent } from "@/lib/checkout/log-checkout-event";
import { env } from "@/config/env";
import { PaymentTransactionsRepository } from "@/repositories/payment-transactions-repo";
import { normalizeCardTypeLabel } from "@/lib/payments/card-brand";

// Simple sliding-window rate limiter: max 10 checkout attempts per IP per 60 s.
// Works for traditional Node servers. Replace with Redis for serverless/multi-instance.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const ipAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (ipAttempts.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (attempts.length >= RATE_LIMIT_MAX) {
    ipAttempts.set(ip, attempts);
    return true;
  }
  attempts.push(now);
  ipAttempts.set(ip, attempts);
  return false;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const startedAt = Date.now();

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const userEmail = user?.email ?? null;

    const customerIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    if (customerIp && isRateLimited(customerIp)) {
      return json({ error: "Too many requests", code: "RATE_LIMITED", requestId }, 429);
    }

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
      nfToken,
      last4,
      cardType: submittedCardType,
    } = parsed.data;

    // superRefine already guarantees these, but we narrow here so TypeScript
    // knows they're non-null for the rest of the function without ! assertions.
    if (
      nonce === null ||
      nonce === undefined ||
      expiryMonth === null ||
      expiryMonth === undefined ||
      expiryYear === null ||
      expiryYear === undefined
    ) {
      return json({ error: "Invalid payload", requestId }, 400);
    }

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
      if (existingOrder.status === "failed") {
        await ordersRepo.resetFailedOrderForRetry(
          existingOrder.id,
          new Date(Date.now() + 60 * 60 * 1000),
        );
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

    // Fetch product names + categories for NoFraud line items
    const productIds = [...new Set(lineItems.map((li) => li.productId))];
    const { data: productRows, error: productRowsError } = await adminSupabase
      .from("products")
      .select("id, name, category")
      .in("id", productIds);
    if (productRowsError) {
      log({
        level: "warn",
        layer: "api",
        message: "nofraud_product_fetch_failed",
        requestId,
        error: productRowsError.message,
      });
    }
    const productMap = new Map((productRows ?? []).map((p) => [p.id, p]));
    const nofraudLineItems = lineItems.map((li) => {
      const product = productMap.get(li.productId);
      const category = product?.category ?? null;
      const name = product?.name ?? "Product";
      return {
        name: category ? `${name} (${category})` : name,
        quantity: li.quantity,
        unitPrice: li.unitPrice.toFixed(2),
        totalPrice: li.lineTotal.toFixed(2),
      };
    });

    const payrillaService = new PayrillaChargeService(adminSupabase, tenantId);
    const paymentTxRepo = new PaymentTransactionsRepository(adminSupabase);
    let chargeResult;
    let nofraudResult: NoFraudResult | null = null;

    // Resolve billing name parts for NoFraud + PayRilla (billing.name = "First Last")
    const billingName = billingAddress?.name ?? null;
    const billingNameParts = billingName?.trim().split(/\s+/) ?? [];
    const billingFirstName = billingNameParts[0] ?? "";
    const billingLastName = billingNameParts.slice(1).join(" ") || billingFirstName;

    // Resolve shipping name parts similarly
    const shippingName = shippingAddress?.name ?? null;
    const shippingNameParts = shippingName?.trim().split(/\s+/) ?? [];
    const shippingFirstName = shippingNameParts[0] ?? "";
    const shippingLastName = shippingNameParts.slice(1).join(" ") || shippingFirstName;
    const normalizedSubmittedCardType = normalizeCardTypeLabel(submittedCardType);

    // Create payment_transaction row before charging
    let paymentTxId: string | null = null;
    try {
      const txRow = await paymentTxRepo.create({
        orderId: order.id,
        tenantId,
        amountRequested: pricing.total,
        billingName: billingName,
        billingAddress: billingAddress?.line1 ?? null,
        billingCity: billingAddress?.city ?? null,
        billingState: billingAddress?.state ?? null,
        cardExpiryMonth: expiryMonth,
        cardExpiryYear: expiryYear,
        billingZip: billingAddress?.postal_code ?? null,
        billingCountry: billingAddress?.country ?? null,
        billingPhone: billingAddress?.phone ?? null,
        customerEmail: guestEmail ?? userEmail ?? null,
        customerIp,
      });
      paymentTxId = txRow.id;

      await paymentTxRepo.logEvent({
        paymentTransactionId: paymentTxId,
        orderId: order.id,
        tenantId,
        eventType: "payment_started",
        eventData: { fulfillment, itemCount: items.length },
      });
    } catch {
      // Non-fatal — continue even if event logging fails
    }

    {
      // ---- Card flow: auth-only → NoFraud → capture ----
      // Auth-only ensures nothing appears on the customer's statement until
      // fraud screening passes. If NoFraud rejects the order, we void the
      // authorization — the customer never sees a charge.

      let authResult;
      try {
        authResult = await payrillaService.createTransaction({
          nonce: nonce,
          amountCents: totalCents,
          expiryMonth: expiryMonth,
          expiryYear: expiryYear,
          avsZip: avsZip ?? billingAddress?.postal_code ?? null,
          avsAddress: billingAddress?.line1 ?? null,
          cardholderName: cardholderName ?? billingName ?? null,
          orderId: order.id,
          customerIp,
          billingInfo: billingAddress
            ? {
                firstName: billingFirstName,
                lastName: billingLastName,
                street: billingAddress.line1,
                city: billingAddress.city,
                state: billingAddress.state,
                zip: billingAddress.postal_code,
                country: billingAddress.country,
                phone: billingAddress.phone ?? null,
              }
            : null,
          shippingInfo: shippingAddress
            ? {
                firstName: shippingFirstName,
                lastName: shippingLastName,
                street: shippingAddress.line1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip: shippingAddress.postal_code,
                country: shippingAddress.country,
              }
            : null,
          customerEmail: guestEmail ?? null,
        });
      } catch (err) {
        logError(err, {
          layer: "api",
          requestId,
          orderId: order.id,
          event: "payrilla_auth_failed",
        });
        if (paymentTxId) {
          try {
            await paymentTxRepo.logEvent({
              paymentTransactionId: paymentTxId,
              orderId: order.id,
              tenantId,
              eventType: "authorization_error",
              eventData: { error: err instanceof Error ? err.message : String(err) },
            });
            await paymentTxRepo.update(paymentTxId, { payrillaStatus: "error" });
          } catch {
            /* non-fatal */
          }
        }
        await adminSupabase
          .from("orders")
          .update({ status: "failed", failure_reason: "Payment processing error" })
          .eq("id", order.id);
        void logCheckoutEvent(adminSupabase, {
          orderId: order.id,
          tenantId,
          requestId,
          route: "/api/checkout/create-checkout",
          httpStatus: 402,
          durationMs: Date.now() - startedAt,
          eventLabel: "Payment processing error",
          errorMessage: "PAYMENT_FAILED",
          requestPayload: body,
          responsePayload: {
            error: "Payment processing failed",
            code: "PAYMENT_FAILED",
            requestId,
          },
        });
        return json(
          { error: "Payment processing failed", code: "PAYMENT_FAILED", requestId },
          402,
        );
      }

      if (authResult.status !== "approved") {
        if (paymentTxId) {
          try {
            await paymentTxRepo.update(paymentTxId, {
              payrillaReferenceNumber: authResult.transactionId
                ? parseInt(authResult.transactionId, 10)
                : null,
              payrillaStatus: authResult.status === "declined" ? "declined" : "error",
              avsResultCode: authResult.avsResultCode ?? null,
              cvv2ResultCode: authResult.cvvResultCode ?? null,
              cardType:
                normalizeCardTypeLabel(authResult.cardType) ??
                normalizedSubmittedCardType ??
                null,
              cardLast4: authResult.last4 ?? last4 ?? null,
            });
            await paymentTxRepo.logEvent({
              paymentTransactionId: paymentTxId,
              orderId: order.id,
              tenantId,
              eventType:
                authResult.status === "declined"
                  ? "authorization_declined"
                  : "authorization_error",
              eventData: authResult.rawResponse ?? {},
            });
          } catch {
            /* non-fatal */
          }
        }
        const isDecline = authResult.status === "declined";
        await adminSupabase
          .from("orders")
          .update({
            status: "failed",
            failure_reason: isDecline ? "Card declined" : "Payment error",
          })
          .eq("id", order.id);
        void logCheckoutEvent(adminSupabase, {
          orderId: order.id,
          tenantId,
          requestId,
          route: "/api/checkout/create-checkout",
          httpStatus: 402,
          durationMs: Date.now() - startedAt,
          eventLabel: isDecline ? "Card declined" : "Payment error",
          errorMessage: isDecline ? "CARD_DECLINED" : "PAYMENT_ERROR",
          requestPayload: body,
          responsePayload: {
            error: isDecline ? "Card declined" : "Payment error",
            code: isDecline ? "CARD_DECLINED" : "PAYMENT_ERROR",
            requestId,
          },
        });
        return json(
          {
            error: isDecline ? "Card declined" : "Payment error",
            code: isDecline ? "CARD_DECLINED" : "PAYMENT_ERROR",
            requestId,
          },
          402,
        );
      }

      // Log authorization approved
      if (paymentTxId) {
        try {
          await paymentTxRepo.update(paymentTxId, {
            payrillaReferenceNumber: authResult.transactionId
              ? parseInt(authResult.transactionId, 10)
              : null,
            payrillaAuthCode: authResult.authCode ?? null,
            payrillaStatus: "authorized",
            avsResultCode: authResult.avsResultCode ?? null,
            cvv2ResultCode: authResult.cvvResultCode ?? null,
            cardType:
              normalizeCardTypeLabel(authResult.cardType) ??
              normalizedSubmittedCardType ??
              null,
            cardLast4: authResult.last4 ?? last4 ?? null,
            amountAuthorized: authResult.authAmount ?? pricing.total,
          });
          await paymentTxRepo.logEvent({
            paymentTransactionId: paymentTxId,
            orderId: order.id,
            tenantId,
            eventType: "authorization_approved",
            eventData: {
              referenceNumber: authResult.transactionId,
              authCode: authResult.authCode,
              authAmount: authResult.authAmount,
              avsResultCode: authResult.avsResultCode,
              cvv2ResultCode: authResult.cvvResultCode,
              cardType: authResult.cardType,
              last4: authResult.last4,
            },
          });
        } catch {
          /* non-fatal */
        }
      }

      // NoFraud screening — AVS/CVV codes from authorization required by NoFraud
      const nofraud = new NoFraudService();
      nofraudResult = await nofraud.screenTransaction({
        nfToken: nfToken ?? null,
        amount: (totalCents / 100).toFixed(2),
        shippingAmount: pricing.shipping.toFixed(2),
        customerIP: customerIp ?? "",
        email: guestEmail ?? userEmail ?? "",
        avsResultCode: authResult.avsResultCode ?? "",
        cvvResultCode: authResult.cvvResultCode ?? "",
        gatewayName: "PayRilla",
        gatewayStatus: "approved",
        invoiceNumber: order.id,
        lineItems: nofraudLineItems,
        payment:
          authResult.last4 || last4
            ? {
                cardType: (
                  normalizeCardTypeLabel(authResult.cardType) ??
                  normalizedSubmittedCardType ??
                  "unknown"
                ).toLowerCase(),
                last4: authResult.last4 ?? last4 ?? "",
              }
            : null,
        billTo: billingAddress
          ? {
              firstName: billingFirstName,
              lastName: billingLastName,
              address: billingAddress.line1,
              city: billingAddress.city,
              state: billingAddress.state,
              zip: billingAddress.postal_code,
              country: billingAddress.country,
              phoneNumber: billingAddress.phone ?? null,
            }
          : null,
        shipTo: shippingAddress
          ? {
              firstName: shippingFirstName,
              lastName: shippingLastName,
              address: shippingAddress.line1,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zip: shippingAddress.postal_code,
              country: shippingAddress.country,
            }
          : null,
      });

      // Label orders processed while NoFraud was unreachable
      if (!nofraudResult.ok) {
        log({
          level: "warn",
          layer: "api",
          message: "nofraud_skipped",
          requestId,
          orderId: order.id,
          reason: nofraudResult.error,
        });
        if (paymentTxId) {
          try {
            await paymentTxRepo.update(paymentTxId, { nofraudDecision: "skipped" });
            await paymentTxRepo.logEvent({
              paymentTransactionId: paymentTxId,
              orderId: order.id,
              tenantId,
              eventType: "fraud_check_skipped",
              eventData: { reason: nofraudResult.error },
            });
          } catch {
            /* non-fatal */
          }
        }
      }

      // Log NoFraud result
      if (paymentTxId && nofraudResult.ok) {
        const nfDecision = nofraudResult.response.decision;
        try {
          await paymentTxRepo.update(paymentTxId, {
            nofraudTransactionId: nofraudResult.response.id,
            nofraudDecision: nfDecision,
          });
          await paymentTxRepo.logEvent({
            paymentTransactionId: paymentTxId,
            orderId: order.id,
            tenantId,
            eventType:
              nfDecision === "pass"
                ? "fraud_check_pass"
                : nfDecision === "review"
                  ? "fraud_check_review"
                  : "fraud_check_fail",
            eventData: {
              decision: nfDecision,
              transactionId: nofraudResult.response.id,
              message: nofraudResult.response.message,
            },
          });
        } catch {
          /* non-fatal */
        }
      }

      if (nofraudResult.ok && nofraudResult.response.decision === "fail") {
        try {
          await payrillaService.voidTransaction(authResult.transactionId);
          if (paymentTxId) {
            await paymentTxRepo.update(paymentTxId, { payrillaStatus: "voided" });
            await paymentTxRepo.logEvent({
              paymentTransactionId: paymentTxId,
              orderId: order.id,
              tenantId,
              eventType: "payment_voided",
              eventData: { reason: "fraud_check_fail" },
            });
          }
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
          .update({ status: "blocked", failure_reason: "Blocked by fraud screening" })
          .eq("id", order.id);
        void logCheckoutEvent(adminSupabase, {
          orderId: order.id,
          tenantId,
          requestId,
          route: "/api/checkout/create-checkout",
          httpStatus: 402,
          durationMs: Date.now() - startedAt,
          eventLabel: "Blocked by fraud screening",
          errorMessage: "FRAUD_BLOCKED",
          requestPayload: body,
          responsePayload: {
            error: "Order could not be processed",
            code: "FRAUD_BLOCKED",
            requestId,
          },
        });
        return json(
          { error: "Order could not be processed", code: "FRAUD_BLOCKED", requestId },
          402,
        );
      }

      // NoFraud review — keep auth on hold, wait for resolution
      if (nofraudResult.ok && nofraudResult.response.decision === "review") {
        await adminSupabase
          .from("orders")
          .update({ status: "review" })
          .eq("id", order.id);
        void logCheckoutEvent(adminSupabase, {
          orderId: order.id,
          tenantId,
          requestId,
          route: "/api/checkout/create-checkout",
          httpStatus: 200,
          durationMs: Date.now() - startedAt,
          eventLabel: "Order placed under review",
          requestPayload: body,
          responsePayload: {
            status: "under_review",
            orderId: order.id,
            requestId,
          },
        });
        // Return under_review so frontend can redirect appropriately
        return json(
          {
            status: "under_review",
            orderId: order.id,
            requestId,
          },
          200,
        );
      }

      // NoFraud passed — capture the authorization
      try {
        await payrillaService.captureTransaction(authResult.transactionId);
        if (paymentTxId) {
          await paymentTxRepo.update(paymentTxId, {
            payrillaStatus: "captured",
            amountCaptured: authResult.authAmount ?? pricing.total,
          });
          await paymentTxRepo.logEvent({
            paymentTransactionId: paymentTxId,
            orderId: order.id,
            tenantId,
            eventType: "payment_captured",
            eventData: { referenceNumber: authResult.transactionId },
          });
        }
      } catch (err) {
        logError(err, {
          layer: "api",
          requestId,
          orderId: order.id,
          event: "payrilla_capture_failed",
        });
        void logCheckoutEvent(adminSupabase, {
          orderId: order.id,
          tenantId,
          requestId,
          route: "/api/checkout/create-checkout",
          httpStatus: 402,
          durationMs: Date.now() - startedAt,
          eventLabel: "Payment capture failed",
          errorMessage: "CAPTURE_FAILED",
          requestPayload: body,
          responsePayload: {
            error: "Payment capture failed",
            code: "CAPTURE_FAILED",
            requestId,
          },
        });
        return json(
          { error: "Payment capture failed", code: "CAPTURE_FAILED", requestId },
          402,
        );
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
        .in("status", ["pending", "processing", "failed"])
        .select("id")
        .maybeSingle();
      didMarkPaid = Boolean(fallback);
    }

    if (didMarkPaid) {
      // Sync size tags
      const productService = new ProductService(adminSupabase);
      const orderItemProductIds = [...new Set(orderItems.map((i) => i.product_id))];
      for (const pid of orderItemProductIds) {
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

    void logCheckoutEvent(adminSupabase, {
      orderId: order.id,
      tenantId,
      requestId,
      route: "/api/checkout/create-checkout",
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
      eventLabel: "Payment approved — order complete",
    });

    void logCheckoutEvent(adminSupabase, {
      orderId: order.id,
      tenantId,
      requestId,
      route: "/api/checkout/create-checkout",
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
      eventLabel: "Payment approved response",
      requestPayload: body,
      responsePayload: {
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
