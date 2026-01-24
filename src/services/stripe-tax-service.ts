// src/services/stripe-tax-service.ts

import Stripe from "stripe";

import { env } from "@/config/env";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { PRODUCT_TAX_CODES } from "@/config/constants/nexus-thresholds";
import { log, logError } from "@/lib/log";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export class StripeTaxService {
  private nexusRepo: NexusRepository;
  private taxSettingsRepo: TaxSettingsRepository;
  private stripeClient: Stripe;
  private readonly stripeAccountId?: string;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    stripeAccountId?: string | null,
  ) {
    this.nexusRepo = new NexusRepository(supabase);
    this.taxSettingsRepo = new TaxSettingsRepository(supabase);
    this.stripeAccountId = stripeAccountId ?? undefined;
    this.stripeClient = stripeAccountId
      ? new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-10-29.clover",
          stripeAccount: stripeAccountId,
        })
      : stripe;
  }

  async getHeadOfficeAddress(): Promise<{
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null> {
    try {
      const settings = await this.stripeClient.tax.settings.retrieve();

      if (settings.head_office?.address) {
        const addr = settings.head_office.address;
        return {
          line1: addr.line1 ?? "",
          line2: addr.line2 ?? null,
          city: addr.city ?? "",
          state: addr.state ?? "",
          postal_code: addr.postal_code ?? "",
          country: addr.country ?? "US",
        };
      }
      return null;
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "head_office_address_retrieval_failed",
      });
      return null;
    }
  }

  async setHeadOfficeAddress(params: {
    tenantId: string;
    stateCode: string;
    businessName?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    skipAutoRegister?: boolean;
  }): Promise<void> {
    try {
      const existingSettings = await this.taxSettingsRepo.getByTenant(params.tenantId);

      await this.stripeClient.tax.settings.update({
        defaults: {
          tax_behavior: "exclusive",
        },
        head_office: {
          address: {
            line1: params.address.line1,
            line2: params.address.line2 || undefined,
            city: params.address.city,
            state: params.address.state,
            postal_code: params.address.postalCode,
            country: params.address.country,
          },
        },
      });

      await this.taxSettingsRepo.upsert({
        tenantId: params.tenantId,
        homeState: params.stateCode,
        businessName: params.businessName ?? existingSettings?.business_name ?? null,
        stripeTaxSettingsId: "configured",
        taxEnabled: existingSettings?.tax_enabled ?? false,
        taxCodeOverrides:
          (existingSettings?.tax_code_overrides as Record<string, string> | null) ?? {},
      });

      await this.nexusRepo.upsertRegistration({
        tenantId: params.tenantId,
        stateCode: params.stateCode,
        registrationType: "physical",
        isRegistered: false,
        registeredAt: null,
        stripeRegistrationId: null,
      });

      log({
        level: "info",
        layer: "service",
        message: "head_office_configured",
        tenantId: params.tenantId,
        state: params.stateCode,
      });
    } catch (error: any) {
      logError(error, {
        layer: "service",
        message: "head_office_setup_failed",
      });
      throw new Error(`Failed to set head office: ${error.message}`);
    }
  }

  async setHomeState(params: { tenantId: string; stateCode: string }): Promise<void> {
    try {
      const existingSettings = await this.taxSettingsRepo.getByTenant(params.tenantId);

      await this.taxSettingsRepo.upsert({
        tenantId: params.tenantId,
        homeState: params.stateCode,
        businessName: existingSettings?.business_name ?? null,
        stripeTaxSettingsId: existingSettings?.stripe_tax_settings_id ?? null,
        taxEnabled: existingSettings?.tax_enabled ?? false,
        taxCodeOverrides:
          (existingSettings?.tax_code_overrides as Record<string, string> | null) ?? {},
      });
    } catch (error: any) {
      logError(error, {
        layer: "service",
        message: "set_home_state_failed",
      });
      throw new Error(`Failed to set home state: ${error.message}`);
    }
  }

  async isHeadOfficeConfigured(): Promise<boolean> {
    try {
      const settings = await this.stripeClient.tax.settings.retrieve();
      return settings.status === "active" && !!settings.head_office;
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "head_office_check_failed",
      });
      return false;
    }
  }

  /**
   * Calculate tax for a checkout session
   */
  async calculateTax(params: {
    currency: string;
    customerAddress: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null;
    lineItems: Array<{
      amount: number;
      quantity: number;
      productId: string;
      category: string;
    }>;
    shippingCost?: number;
    taxCodes?: Record<string, string>;
    taxEnabled?: boolean;
  }): Promise<{
    taxAmount: number;
    totalAmount: number;
    taxCalculationId: string | null;
  }> {
    const normalizedTaxCodes: Record<string, string> = {};
    for (const [key, value] of Object.entries(params.taxCodes ?? {})) {
      const normalizedKey = key.trim().toLowerCase();
      const cleaned = String(value ?? "").trim();
      if (!normalizedKey || !cleaned) {
        continue;
      }
      normalizedTaxCodes[normalizedKey] = cleaned;
    }

    const lineItems: Stripe.Tax.CalculationCreateParams.LineItem[] = params.lineItems.map(
      (item) => {
        const categoryKey = item.category?.trim().toLowerCase();
        const defaultCode =
          (categoryKey &&
            PRODUCT_TAX_CODES[categoryKey as keyof typeof PRODUCT_TAX_CODES]) ??
          "txcd_99999999";
        const taxCode = (categoryKey && normalizedTaxCodes[categoryKey]) ?? defaultCode;

        return {
          amount: item.amount,
          quantity: item.quantity ?? 1,
          reference: item.productId,
          tax_code: taxCode,
        };
      },
    );

    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.amount * (item.quantity ?? 1),
      0,
    );

    // Early exit if tax is disabled
    if (params.taxEnabled === false) {
      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }

    // Early exit if no customer address
    if (!params.customerAddress) {
      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }

    try {
      const calculationParams: Stripe.Tax.CalculationCreateParams = {
        currency: params.currency.toLowerCase(),
        line_items: lineItems,
        customer_details: {
          address: {
            line1: params.customerAddress.line1,
            line2: params.customerAddress.line2 ?? undefined,
            city: params.customerAddress.city,
            state: params.customerAddress.state,
            postal_code: params.customerAddress.postal_code,
            country: params.customerAddress.country,
          },
          address_source: "shipping",
        },
        expand: ["line_items"],
      };

      if (params.shippingCost && params.shippingCost > 0) {
        calculationParams.shipping_cost = {
          amount: params.shippingCost,
        };
      }

      const calculation =
        await this.stripeClient.tax.calculations.create(calculationParams);

      const taxAmount = calculation.tax_amount_exclusive ?? 0;
      const totalAmount = subtotal + taxAmount;

      log({
        level: "info",
        layer: "service",
        message: "tax_calculated",
        calculationId: calculation.id,
        taxAmount,
        state: params.customerAddress.state,
      });

      return {
        taxAmount,
        totalAmount,
        taxCalculationId: calculation.id,
      };
    } catch (error: any) {
      logError(error, {
        layer: "service",
        message: "tax_calculation_failed",
        state: params.customerAddress?.state,
      });

      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }
  }

  async createTaxTransaction(params: {
    taxCalculationId: string;
    reference: string;
  }): Promise<string | null> {
    try {
      const transaction = await this.stripeClient.tax.transactions.createFromCalculation({
        calculation: params.taxCalculationId,
        reference: params.reference,
      });

      log({
        level: "info",
        layer: "service",
        message: "tax_transaction_created",
        transactionId: transaction.id,
        calculationId: params.taxCalculationId,
      });

      return transaction.id;
    } catch (error: any) {
      logError(error, {
        layer: "service",
        message: "tax_transaction_failed",
        calculationId: params.taxCalculationId,
      });
      return null;
    }
  }

  async registerState(params: {
    tenantId: string;
    stateCode: string;
    registrationType: "physical" | "economic";
  }): Promise<void> {
    const isConfigured = await this.isHeadOfficeConfigured();
    if (!isConfigured) {
      throw new Error(
        "Head office address must be set before registering states. Please configure your business address first.",
      );
    }

    const existingRegistrations = await this.getStripeRegistrations();
    const existingReg = existingRegistrations.get(params.stateCode);

    let stripeRegistrationId: string | null = null;

    if (existingReg?.active) {
      stripeRegistrationId = existingReg.id;
    } else {
      try {
        const registration = await this.stripeClient.tax.registrations.create({
          country: "US",
          country_options: {
            us: {
              type: "state_sales_tax",
              state: params.stateCode,
            },
          },
          active_from: "now",
        });
        stripeRegistrationId = registration.id;
      } catch (error: any) {
        if (error.message?.includes("already added a registration")) {
          const regs = await this.stripeClient.tax.registrations.list({ limit: 100 });
          const existing = regs.data.find(
            (r) =>
              r.country === "US" && r.country_options?.us?.state === params.stateCode,
          );
          if (existing) {
            stripeRegistrationId = existing.id;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: params.registrationType,
      isRegistered: true,
      registeredAt: new Date().toISOString(),
      stripeRegistrationId,
    });

    log({
      level: "info",
      layer: "service",
      message: "state_registered",
      state: params.stateCode,
      type: params.registrationType,
    });
  }

  async unregisterState(params: {
    tenantId: string;
    stateCode: string;
    registrationType?: "physical" | "economic";
  }): Promise<void> {
    const existing = await this.nexusRepo.getRegistration(
      params.tenantId,
      params.stateCode,
    );

    let stripeRegistrationId: string | null = existing?.stripe_registration_id ?? null;

    if (!stripeRegistrationId) {
      const regs = await this.getStripeRegistrations();
      stripeRegistrationId = regs.get(params.stateCode)?.id ?? null;
    }

    if (stripeRegistrationId) {
      try {
        await this.stripeClient.tax.registrations.update(stripeRegistrationId, {
          expires_at: "now",
        });
      } catch (error: any) {
        const msg = String(error?.message ?? "");
        if (
          !msg.toLowerCase().includes("no such") &&
          !msg.toLowerCase().includes("resource")
        ) {
          throw new Error(`Failed to unregister on Stripe: ${msg}`);
        }
      }
    }

    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType:
        params.registrationType ?? existing?.registration_type ?? "economic",
      isRegistered: false,
      registeredAt: null,
      stripeRegistrationId: null,
    });

    log({
      level: "info",
      layer: "service",
      message: "state_unregistered",
      state: params.stateCode,
    });
  }

  async getStripeRegistrations(): Promise<
    Map<string, { id: string; state: string; active: boolean }>
  > {
    try {
      const registrations = await this.stripeClient.tax.registrations.list({
        limit: 100,
      });

      const map = new Map<string, { id: string; state: string; active: boolean }>();

      for (const reg of registrations.data) {
        if (reg.country === "US" && reg.country_options?.us?.state) {
          const state = reg.country_options.us.state;
          map.set(state, {
            id: reg.id,
            state,
            active: reg.status === "active",
          });
        }
      }

      return map;
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "stripe_registrations_retrieval_failed",
      });
      return new Map();
    }
  }

  async deactivateStripeTaxRegistrations(): Promise<number> {
    try {
      let deactivated = 0;
      let startingAfter: string | undefined;

      while (true) {
        const regs = await this.stripeClient.tax.registrations.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        for (const reg of regs.data) {
          if (reg.status === "active" || reg.status === "scheduled") {
            await this.stripeClient.tax.registrations.update(reg.id, {
              expires_at: "now",
            });
            deactivated += 1;
          }
        }

        if (!regs.has_more) {
          break;
        }
        const last = regs.data[regs.data.length - 1];
        if (!last) {
          break;
        }
        startingAfter = last.id;
      }

      log({
        level: "info",
        layer: "service",
        message: "tax_registrations_deactivated",
        count: deactivated,
      });

      return deactivated;
    } catch (error: any) {
      logError(error, {
        layer: "service",
        message: "tax_deactivation_failed",
      });
      throw new Error(error?.message ?? "Failed to deactivate Stripe Tax registrations");
    }
  }

    async downloadTaxDocuments(params: {
    year: number;
    month?: number;
  }): Promise<{ url: string; expiresAt: number } | null> {
    const { year, month } = params;

    // Enforce connected account context (per your requirement)
    if (!this.stripeAccountId) {
      logError(new Error("Missing stripeAccountId"), {
        layer: "service",
        message: "tax_document_download_missing_connected_account",
      });
      return null;
    }

    // Validate inputs
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      logError(new Error("Invalid year"), {
        layer: "service",
        message: "tax_document_download_invalid_year",
        year,
      });
      return null;
    }
    if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
      logError(new Error("Invalid month"), {
        layer: "service",
        message: "tax_document_download_invalid_month",
        year,
        month,
      });
      return null;
    }

    // Build interval in UTC (Stripe expects unix seconds; interval_end is exclusive)
    const start = month
      ? new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
      : new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = month
      ? new Date(Date.UTC(year, month, 1, 0, 0, 0))
      : new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const intervalStart = Math.floor(start.getTime() / 1000);
    const intervalEnd = Math.floor(end.getTime() / 1000);

    try {
      // Tax report type (CSV): tax.transactions.itemized.2 requires interval_start/interval_end
      // Docs: https://docs.stripe.com/reports/report-types/tax
      const reportRun = await this.stripeClient.reporting.reportRuns.create({
        report_type: "tax.transactions.itemized.2",
        parameters: {
          interval_start: intervalStart,
          interval_end: intervalEnd,
          timezone: "America/New_York",
          // If you ever switch to a platform-scoped Stripe client (no stripeAccount header),
          // you can also filter with:
          // connected_account: this.stripeAccountId,
        },
      });

      // Poll until the report finishes (short, bounded wait)
      const maxAttempts = 10;
      let current = reportRun;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (current.status === "succeeded") break;
        if (current.status === "failed") {
          logError(new Error("Report run failed"), {
            layer: "service",
            message: "tax_document_report_run_failed",
            reportRunId: current.id,
            year,
            month,
          });
          return null;
        }

        // backoff: 500ms, 750ms, 1125ms...
        const delayMs = Math.round(500 * Math.pow(1.5, attempt));
        await new Promise((r) => setTimeout(r, delayMs));

        current = await this.stripeClient.reporting.reportRuns.retrieve(current.id);
      }

      if (current.status !== "succeeded" || !current.result) {
        logError(new Error("Report run not ready"), {
          layer: "service",
          message: "tax_document_report_run_not_ready",
          reportRunId: current.id,
          statuss: current.status,
          year,
          month,
        });
        return null;
      }

      const fileId = typeof current.result === "string" ? current.result : current.result.id;

      // Create an expiring, unauthenticated link (keep TTL short)
      const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes
      const fileLink = await this.stripeClient.fileLinks.create({
        file: fileId,
        expires_at: expiresAt,
        metadata: {
          kind: "tax_transactions_itemized",
          year: String(year),
          month: month ? String(month) : "",
        },
      });

      // ✅ TS fix: Stripe types allow url to be null
      if (!fileLink.url) {
        logError(new Error("Stripe fileLink.url is null"), {
          layer: "service",
          message: "tax_document_download_link_missing_url",
          fileId,
          reportRunId: current.id,
          year,
          month,
        });
        return null;
      }

      return { url: fileLink.url, expiresAt };
    } catch (error) {
      logError(error, {
        layer: "service",
        message: "tax_document_download_failed",
        year,
        month,
      });
      return null;
    }
  }
}
