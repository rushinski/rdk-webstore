// src/services/nofraud-service.ts
//
// Fraud screening via NoFraud Transaction API (https://developers.nofraud.com/transaction-api).
// Called after payment is authorized, before fulfillment begins.
//
// Free tier: 100 orders/month (upgrade path: wyllo.ai/pricing)
//
// IMPORTANT: NoFraud's chargeback guarantee covers FRAUDULENT CARD USE ONLY.
// It does NOT cover "item not received" or "item not as described" disputes.
// Those are defended via the chargeback_evidence locker (EvidenceService).
//
// Decision handling:
//   pass   → proceed with fulfillment
//   review → flag order for manual review, pause fulfillment, alert admin
//   fail   → initiate refund, mark order failed

import { env } from "@/config/env";
import { log, logError } from "@/lib/utils/log";

const NOFRAUD_API_URL = "https://api.nofraud.com/transaction";

export type NoFraudDecision = "pass" | "fail" | "review";

export type NoFraudLineItem = {
  sku?: string | null;
  name: string;
  quantity: number;
  unitPrice: string; // e.g. "99.00"
  totalPrice: string; // e.g. "198.00"
};

export type NoFraudAddress = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phoneNumber?: string | null;
};

export type NoFraudPayment = {
  cardType: string; // "visa", "mastercard", etc.
  last4: string;
  bin?: string | null;
};

export type NoFraudRequest = {
  // Device fingerprint token — set by the NoFraud JS snippet on the checkout page.
  // The script (services.nofraud.com/js/{customerCode}/customer_code.js) writes
  // a cookie that the frontend reads and sends with the checkout POST.
  nfToken?: string | null;

  // Customer
  email?: string | null;
  customerIP?: string | null;
  id?: string | null; // customer ID in our system

  // Order
  amount: string; // total amount as string, e.g. "175.00"
  shippingAmount?: string | null;
  shippingMethod?: string | null;
  invoiceNumber?: string | null;
  currencyCode?: string | null;

  // Payment gateway data from PayRilla
  gatewayName?: string;
  gatewayStatus?: string | null;
  avsResultCode?: string | null;
  cvvResultCode?: string | null;
  cardAttempts?: number | null;

  // Card info for NoFraud payment object
  payment?: NoFraudPayment | null;

  // Billing and shipping addresses
  billTo?: NoFraudAddress | null;
  shipTo?: NoFraudAddress | null;

  // Line items
  lineItems?: NoFraudLineItem[] | null;

  // Customer history (improves accuracy)
  totalPreviousPurchases?: number | null;
  totalPurchaseValue?: string | null;
  lastPurchaseDate?: string | null;

  // Merchant context
  merchantName?: string | null;
  merchantWebsite?: string | null;
};

export type NoFraudResponse = {
  id: string;
  decision: NoFraudDecision;
  message?: string | null;
};

export type NoFraudResult =
  | { ok: true; response: NoFraudResponse }
  | { ok: false; error: string };

export class NoFraudService {
  /**
   * Screen a transaction for fraud.
   * Returns the NoFraud decision and transaction ID to store in evidence.
   * Never throws — always returns a result object.
   */
  async screenTransaction(request: NoFraudRequest): Promise<NoFraudResult> {
    try {
      const payload = this.buildPayload(request);

      const response = await fetch(NOFRAUD_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "nf-token": env.NOFRAUD_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        log({
          level: "warn",
          layer: "service",
          message: "nofraud_api_error",
          status: response.status,
          body: text.slice(0, 200),
        });
        return { ok: false, error: `NoFraud API returned ${response.status}` };
      }

      const json = (await response.json()) as NoFraudResponse;

      if (!json.id || !json.decision) {
        return { ok: false, error: "NoFraud response missing id or decision" };
      }

      log({
        level: "info",
        layer: "service",
        message: "nofraud_screened",
        transactionId: json.id,
        decision: json.decision,
        invoiceNumber: request.invoiceNumber,
      });

      return { ok: true, response: json };
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "nofraud_screening_failed",
        invoiceNumber: request.invoiceNumber,
      });
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown NoFraud error",
      };
    }
  }

  // ---------- Private ----------

  private buildPayload(request: NoFraudRequest): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      amount: request.amount,
      gatewayName: request.gatewayName ?? "PayRilla",
    };

    if (request.nfToken) {
      payload.nfToken = request.nfToken;
    }
    if (request.email) {
      payload.email = request.email;
    }
    if (request.customerIP) {
      payload.customerIP = request.customerIP;
    }
    if (request.id) {
      payload.id = request.id;
    }
    if (request.shippingAmount) {
      payload.shippingAmount = request.shippingAmount;
    }
    if (request.shippingMethod) {
      payload.shippingMethod = request.shippingMethod;
    }
    if (request.invoiceNumber) {
      payload.invoiceNumber = request.invoiceNumber;
    }
    if (request.currencyCode) {
      payload.currencyCode = request.currencyCode;
    }
    if (request.gatewayStatus) {
      payload.gatewayStatus = request.gatewayStatus;
    }
    if (request.avsResultCode) {
      payload.avsResultCode = request.avsResultCode;
    }
    if (request.cvvResultCode) {
      payload.cvvResultCode = request.cvvResultCode;
    }
    if (request.cardAttempts != null) {
      payload.cardAttempts = request.cardAttempts;
    }
    if (request.totalPreviousPurchases != null) {
      payload.totalPreviousPurchases = request.totalPreviousPurchases;
    }
    if (request.totalPurchaseValue) {
      payload.totalPurchaseValue = request.totalPurchaseValue;
    }
    if (request.lastPurchaseDate) {
      payload.lastPurchaseDate = request.lastPurchaseDate;
    }
    if (request.merchantName) {
      payload.merchantName = request.merchantName;
    }
    if (request.merchantWebsite) {
      payload.merchantWebsite = request.merchantWebsite;
    }
    if (request.payment) {
      payload.payment = {
        method: "creditCard",
        creditCard: {
          cardType: request.payment.cardType,
          last4: request.payment.last4,
          ...(request.payment.bin ? { bin: request.payment.bin } : {}),
        },
      };
    }
    if (request.billTo) {
      payload.billTo = {
        firstName: request.billTo.firstName,
        lastName: request.billTo.lastName,
        address: request.billTo.address,
        city: request.billTo.city,
        state: request.billTo.state,
        zip: request.billTo.zip,
        country: request.billTo.country,
        ...(request.billTo.phoneNumber ? { phoneNumber: request.billTo.phoneNumber } : {}),
      };
    }
    if (request.shipTo) {
      payload.shipTo = {
        firstName: request.shipTo.firstName,
        lastName: request.shipTo.lastName,
        address: request.shipTo.address,
        city: request.shipTo.city,
        state: request.shipTo.state,
        zip: request.shipTo.zip,
        country: request.shipTo.country,
        ...(request.shipTo.phoneNumber ? { phoneNumber: request.shipTo.phoneNumber } : {}),
      };
    }
    if (request.lineItems && request.lineItems.length > 0) {
      payload.lineItems = request.lineItems.map((item) => ({
        ...(item.sku ? { sku: item.sku } : {}),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));
    }

    return payload;
  }
}
