// src/services/payrilla-charge-service.ts
//
// PayRilla payment processing service.
//
// CREDENTIALS:
//   Credentials are stored in AWS SSM Parameter Store (SecureString), not the database.
//   Fetched via getPayrillaSecret(tenantId) with a 1-hour in-process cache.
//   See src/lib/secrets/payrilla-secrets.ts.
//
// TRANSACTION IDs:
//   PayRilla uses integer `reference_number` as the transaction ID.
//   We store it as a string in orders.payment_transaction_id.
//
// AUTH: Basic auth via Authorization header.
//   Base URL: PAYRILLA_API_URL env var (defaults to production).

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/utils/log";
import { env } from "@/config/env";
import { getPayrillaSecret, buildApiKey } from "@/lib/secrets/payrilla-secrets";

export type PayrillaCredentials = {
  apiKey: string; // "source_key:pin" — passed directly to Buffer.from() for Basic auth
  tokenizationKey: string;
  merchantId: string | null;
};

export type PayrillaTransactionResult = {
  transactionId: string; // reference_number as string
  status: "approved" | "declined" | "error";
  authAmount?: number | null; // USD
  authCode?: string | null;
  avsResultCode?: string | null;
  cvvResultCode?: string | null;
  last4?: string | null;
  cardType?: string | null;
  cardRef?: string | null; // token for future charges
  rawResponse?: Record<string, unknown>;
};

// PayRilla API response shapes
type PayrillaChargeResponse = {
  status: "Approved" | "Partially Approved" | "Declined" | "Error";
  status_code: "A" | "P" | "D" | "E";
  error_message?: string;
  error_code?: string;
  auth_amount?: number;
  auth_code?: string;
  reference_number?: number | null;
  avs_result_code?: string;
  cvv2_result_code?: string;
  card_type?: string;
  last_4?: string;
  card_ref?: string | null;
};

export class PayrillaChargeService {
  private readonly baseUrl: string;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    private readonly tenantId: string,
  ) {
    this.baseUrl = env.PAYRILLA_API_URL ?? "https://api.payrillagateway.com/api/v2";
  }

  async getCredentials(): Promise<PayrillaCredentials | null> {
    try {
      const secret = await getPayrillaSecret(this.tenantId);

      if (!secret) {
        logError(new Error("No credentials found"), {
          layer: "service",
          message: "payrilla_credentials_missing",
          tenantId: this.tenantId,
        });
        return null;
      }

      return {
        apiKey: buildApiKey(secret),
        tokenizationKey: secret.tokenizationKey,
        merchantId: null,
      };
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "payrilla_credentials_fetch_error",
        tenantId: this.tenantId,
      });
      return null;
    }
  }

  private authHeader(apiKey: string): string {
    return `Basic ${Buffer.from(apiKey).toString("base64")}`;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    apiKey: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(apiKey),
        "User-Agent": "SneakerEco/1.0",
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!response.ok && response.status !== 200) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `PayRilla API error ${response.status} on ${method} ${path}: ${text}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a charge using a nonce token from the frontend tokenization library.
   *
   * Frontend flow:
   *   1. Load PayRilla Hosted Tokenization with the tenant's tokenization key (pk_...)
   *   2. Call hostedTokenization.getNonceToken() → { nonce, expiryMonth, expiryYear, avsZip }
   *   3. POST those values + orderId + amount to /api/checkout/create-checkout
   *   4. That route calls this method
   *
   * @param params.nonce - The raw nonce string (without "nonce-" prefix)
   * @param params.amountCents - Amount in cents (we convert to USD for API)
   * @param params.expiryMonth - Card expiry month from tokenization result
   * @param params.expiryYear - Card expiry year from tokenization result
   */
  async createTransaction(params: {
    nonce: string;
    amountCents: number;
    expiryMonth: number;
    expiryYear: number;
    avsZip?: string | null;
    avsAddress?: string | null;
    cardholderName?: string | null;
    orderId: string;
    customerIp?: string | null;
    saveCard?: boolean;
  }): Promise<PayrillaTransactionResult> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error("PayRilla credentials not configured for tenant");
    }

    const amountUsd = params.amountCents / 100;

    const chargeBody: Record<string, unknown> = {
      source: `nonce-${params.nonce}`,
      amount: amountUsd,
      expiry_month: params.expiryMonth,
      expiry_year: params.expiryYear,
      ...(params.cardholderName ? { name: params.cardholderName } : {}),
      ...(params.avsZip ? { avs_zip: params.avsZip } : {}),
      ...(params.avsAddress ? { avs_address: params.avsAddress } : {}),
      transaction_details: {
        order_number: params.orderId,
        description: `Order ${params.orderId}`,
        ...(params.customerIp ? { client_ip: params.customerIp } : {}),
      },
      custom_fields: {
        custom1: this.tenantId,
        custom2: params.orderId,
      },
      save_card: params.saveCard ?? false,
      capture: false, // Auth-only — call captureTransaction() after fraud screening passes
    };

    log({
      level: "info",
      layer: "service",
      message: "payrilla_charge_request",
      tenantId: this.tenantId,
      orderId: params.orderId,
      amountUsd,
    });

    const response = await this.request<PayrillaChargeResponse>(
      "POST",
      "/transactions/charge",
      credentials.apiKey,
      chargeBody,
    );

    const isApproved =
      response.status_code === "A" || response.status === "Approved";

    log({
      level: isApproved ? "info" : "warn",
      layer: "service",
      message: isApproved ? "payrilla_charge_approved" : "payrilla_charge_declined",
      tenantId: this.tenantId,
      orderId: params.orderId,
      referenceNumber: response.reference_number,
      statusCode: response.status_code,
      errorCode: response.error_code,
    });

    return {
      transactionId: response.reference_number?.toString() ?? "",
      status: isApproved ? "approved" : response.status_code === "E" ? "error" : "declined",
      authAmount: response.auth_amount,
      authCode: response.auth_code,
      avsResultCode: response.avs_result_code,
      cvvResultCode: response.cvv2_result_code,
      last4: response.last_4,
      cardType: response.card_type,
      cardRef: response.card_ref,
      rawResponse: response as Record<string, unknown>,
    };
  }

  /**
   * Capture a previously authorized (auth-only) transaction.
   * Call this after fraud screening passes.
   */
  async captureTransaction(transactionId: string): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error("PayRilla credentials not configured for tenant");
    }

    const referenceNumber = parseInt(transactionId, 10);
    if (isNaN(referenceNumber)) {
      throw new Error(`Invalid PayRilla transaction ID: ${transactionId}`);
    }

    await this.request(
      "POST",
      "/transactions/capture",
      credentials.apiKey,
      { reference_number: referenceNumber },
    );

    log({
      level: "info",
      layer: "service",
      message: "payrilla_capture_completed",
      tenantId: this.tenantId,
      referenceNumber,
    });
  }

  /**
   * Void an unsettled transaction.
   * For settled transactions, use refundTransaction() instead.
   * Or use reverseTransaction() which handles both automatically.
   */
  async voidTransaction(transactionId: string): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error("PayRilla credentials not configured for tenant");
    }

    const referenceNumber = parseInt(transactionId, 10);
    if (isNaN(referenceNumber)) {
      throw new Error(`Invalid PayRilla transaction ID: ${transactionId}`);
    }

    await this.request(
      "POST",
      "/transactions/void",
      credentials.apiKey,
      { reference_number: referenceNumber },
    );

    log({
      level: "info",
      layer: "service",
      message: "payrilla_void_completed",
      tenantId: this.tenantId,
      referenceNumber,
    });
  }

  /**
   * Refund a settled transaction (full or partial).
   * For unsettled transactions, use voidTransaction() instead.
   * Or use reverseTransaction() which handles both automatically.
   *
   * @param params.amountCents - Amount to refund in cents. Omit for full refund.
   */
  async refundTransaction(params: {
    transactionId: string;
    amountCents?: number;
  }): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error("PayRilla credentials not configured for tenant");
    }

    const referenceNumber = parseInt(params.transactionId, 10);
    if (isNaN(referenceNumber)) {
      throw new Error(`Invalid PayRilla transaction ID: ${params.transactionId}`);
    }

    const body: Record<string, unknown> = { reference_number: referenceNumber };
    if (params.amountCents != null) {
      body.amount = params.amountCents / 100;
    }

    await this.request("POST", "/transactions/refund", credentials.apiKey, body);

    log({
      level: "info",
      layer: "service",
      message: "payrilla_refund_completed",
      tenantId: this.tenantId,
      referenceNumber,
      amountUsd: params.amountCents != null ? params.amountCents / 100 : "full",
    });
  }

  /**
   * Smart reversal: voids if unsettled, refunds if settled.
   * Preferred over calling void/refund separately.
   *
   * @param params.amountCents - Amount to reverse in cents. Omit for full reversal.
   */
  async reverseTransaction(params: {
    transactionId: string;
    amountCents?: number;
  }): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error("PayRilla credentials not configured for tenant");
    }

    const referenceNumber = parseInt(params.transactionId, 10);
    if (isNaN(referenceNumber)) {
      throw new Error(`Invalid PayRilla transaction ID: ${params.transactionId}`);
    }

    const body: Record<string, unknown> = { reference_number: referenceNumber };
    if (params.amountCents != null) {
      body.amount = params.amountCents / 100;
    }

    await this.request("POST", "/transactions/reversal", credentials.apiKey, body);

    log({
      level: "info",
      layer: "service",
      message: "payrilla_reversal_completed",
      tenantId: this.tenantId,
      referenceNumber,
    });
  }

  /**
   * Retrieve a transaction by reference number.
   */
  async getTransaction(transactionId: string): Promise<PayrillaTransactionResult | null> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      return null;
    }

    const referenceNumber = parseInt(transactionId, 10);
    if (isNaN(referenceNumber)) {
      return null;
    }

    try {
      const response = await this.request<PayrillaChargeResponse>(
        "GET",
        `/transactions/${referenceNumber}`,
        credentials.apiKey,
      );

      const isApproved =
        response.status_code === "A" || response.status === "Approved";

      return {
        transactionId: response.reference_number?.toString() ?? transactionId,
        status: isApproved ? "approved" : response.status_code === "E" ? "error" : "declined",
        authAmount: response.auth_amount,
        authCode: response.auth_code,
        avsResultCode: response.avs_result_code,
        cvvResultCode: response.cvv2_result_code,
        last4: response.last_4,
        cardType: response.card_type,
        rawResponse: response as Record<string, unknown>,
      };
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "payrilla_get_transaction_failed",
        tenantId: this.tenantId,
        transactionId,
      });
      return null;
    }
  }
}
