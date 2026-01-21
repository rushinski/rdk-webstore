// src/services/stripe-tax-service.ts (UPDATED)

import Stripe from "stripe";
import { env } from "@/config/env";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { PRODUCT_TAX_CODES } from "@/config/constants/nexus-thresholds";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export class StripeTaxService {
  private nexusRepo: NexusRepository;
  private taxSettingsRepo: TaxSettingsRepository;
  private stripeClient: Stripe;

  constructor(
    private readonly supabase: TypedSupabaseClient,
    stripeAccountId?: string | null,
  ) {
    this.nexusRepo = new NexusRepository(supabase);
    this.taxSettingsRepo = new TaxSettingsRepository(supabase);
    this.stripeClient = stripeAccountId
      ? new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-10-29.clover",
          stripeAccount: stripeAccountId,
        })
      : stripe;
  }

  /**
   * Get the configured head office address
   */
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
          line1: addr.line1 ?? '',
          line2: addr.line2 ?? null,
          city: addr.city ?? '',
          state: addr.state ?? '',
          postal_code: addr.postal_code ?? '',
          country: addr.country ?? 'US',
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve head office address:', error);
      return null;
    }
  }

  /**
   * Set head office address with Stripe Tax Settings API
   * This MUST be called before any tax registrations can be created
   * 
   * UPDATED: No longer auto-registers for tax collection.
   * Just sets the address and marks physical nexus alert.
   */
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

      // Update Stripe Tax Settings with head office address
      await this.stripeClient.tax.settings.update({
        defaults: {
          tax_behavior: 'exclusive',
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

      // Store settings in database
      await this.taxSettingsRepo.upsert({
        tenantId: params.tenantId,
        homeState: params.stateCode,
        businessName: params.businessName ?? existingSettings?.business_name ?? null,
        stripeTaxSettingsId: 'configured',
        taxEnabled: existingSettings?.tax_enabled ?? false,
        taxCodeOverrides: (existingSettings?.tax_code_overrides as Record<string, string> | null) ?? {},
      });

      // CHANGED: Mark home state as having physical nexus but DON'T auto-register
      // This creates an alert that they need to register
      await this.nexusRepo.upsertRegistration({
        tenantId: params.tenantId,
        stateCode: params.stateCode,
        registrationType: 'physical',
        isRegistered: false, // NOT auto-registered
        registeredAt: null,
        stripeRegistrationId: null,
      });
    } catch (error: any) {
      console.error('Stripe head office setup error:', error);
      throw new Error(`Failed to set head office: ${error.message}`);
    }
  }

  /**
   * Set home state only (without address setup)
   * Used when just updating the home state designation
   */
  async setHomeState(params: {
    tenantId: string;
    stateCode: string;
  }): Promise<void> {
    try {
      // Get existing settings
      const existingSettings = await this.taxSettingsRepo.getByTenant(params.tenantId);
      
      // Update just the home state
      await this.taxSettingsRepo.upsert({
        tenantId: params.tenantId,
        homeState: params.stateCode,
        businessName: existingSettings?.business_name ?? null,
        stripeTaxSettingsId: existingSettings?.stripe_tax_settings_id ?? null,
        taxEnabled: existingSettings?.tax_enabled ?? false,
        taxCodeOverrides: (existingSettings?.tax_code_overrides as Record<string, string> | null) ?? {},
      });
    } catch (error: any) {
      console.error('Failed to set home state:', error);
      throw new Error(`Failed to set home state: ${error.message}`);
    }
  }

  /**
   * Check if head office is configured
   */
  async isHeadOfficeConfigured(): Promise<boolean> {
    try {
      const settings = await this.stripeClient.tax.settings.retrieve();
      return settings.status === 'active' && !!settings.head_office;
    } catch (error) {
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
      if (!normalizedKey || !cleaned) continue;
      normalizedTaxCodes[normalizedKey] = cleaned;
    }

    const lineItems: Stripe.Tax.CalculationCreateParams.LineItem[] = params.lineItems.map((item) => {
      const categoryKey = item.category?.trim().toLowerCase();
      const defaultCode =
        (categoryKey && PRODUCT_TAX_CODES[categoryKey as keyof typeof PRODUCT_TAX_CODES]) ??
        "txcd_99999999";
      const taxCode = (categoryKey && normalizedTaxCodes[categoryKey]) ?? defaultCode;

      return {
        amount: item.amount,
        quantity: item.quantity ?? 1,
        reference: item.productId,
        tax_code: taxCode,
      };
    });

    if (params.shippingCost && params.shippingCost > 0) {
      lineItems.push({
        amount: params.shippingCost,
        quantity: 1,
        reference: 'shipping',
        tax_code: 'txcd_92010001',
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0);

    if (params.taxEnabled === false) {
      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }

    if (!params.customerAddress) {
      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }

    try {
      const calculation = await this.stripeClient.tax.calculations.create({
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
          address_source: 'shipping',
        },
        expand: ['line_items'],
      });

      const taxAmount = calculation.tax_amount_exclusive ?? 0;
      const totalAmount = subtotal + taxAmount;

      return {
        taxAmount,
        totalAmount,
        taxCalculationId: calculation.id,
      };
    } catch (error) {
      console.error('Stripe tax calculation error:', error);
      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }
  }

  /**
   * Register a tax calculation as a transaction
   */
  async createTaxTransaction(params: {
    taxCalculationId: string;
    reference: string;
  }): Promise<string | null> {
    try {
      const transaction = await this.stripeClient.tax.transactions.createFromCalculation({
        calculation: params.taxCalculationId,
        reference: params.reference,
      });

      return transaction.id;
    } catch (error) {
      console.error('Stripe tax transaction error:', error);
      return null;
    }
  }

  /**
   * Register for tax collection with Stripe Tax
   * Requires head office to be configured first
   */
  async registerState(params: {
    tenantId: string;
    stateCode: string;
    registrationType: 'physical' | 'economic';
  }): Promise<void> {
    // Check if head office is configured
    const isConfigured = await this.isHeadOfficeConfigured();
    if (!isConfigured) {
      throw new Error('Head office address must be set before registering states. Please configure your business address first.');
    }

    // Check if already registered in Stripe
    const existingRegistrations = await this.getStripeRegistrations();
    const existingReg = existingRegistrations.get(params.stateCode);
    
    let stripeRegistrationId: string | null = null;

    if (existingReg?.active) {
      // Already registered in Stripe, just use existing ID
      stripeRegistrationId = existingReg.id;
    } else {
      try {
        // Create new Stripe Tax registration
        const registration = await this.stripeClient.tax.registrations.create({
          country: 'US',
          country_options: {
            us: {
              type: 'state_sales_tax',
              state: params.stateCode,
            },
          },
          active_from: 'now',
        });
        stripeRegistrationId = registration.id;
      } catch (error: any) {
        // If already registered error, fetch and use existing
        if (error.message?.includes('already added a registration')) {
          const regs = await this.stripeClient.tax.registrations.list({ limit: 100 });
          const existing = regs.data.find(
            r => r.country === 'US' && r.country_options?.us?.state === params.stateCode
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

    // Store registration in database
    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: params.registrationType,
      isRegistered: true,
      registeredAt: new Date().toISOString(),
      stripeRegistrationId,
    });
  }

  /**
   * Unregister from tax collection with Stripe Tax
   */
  async unregisterState(params: {
    tenantId: string;
    stateCode: string;
    registrationType?: "physical" | "economic";
  }): Promise<void> {
    const existing = await this.nexusRepo.getRegistration(params.tenantId, params.stateCode);

    // Prefer DB id, but fall back to Stripe lookup (fixes the bug when DB was cleared).
    let stripeRegistrationId: string | null =
      existing?.stripe_registration_id ?? null;

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
        if (!msg.toLowerCase().includes("no such") && !msg.toLowerCase().includes("resource")) {
          throw new Error(`Failed to unregister on Stripe: ${msg}`);
        }
        // If Stripe says missing, continue to clear local state.
      }
    }

    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: params.registrationType ?? existing?.registration_type ?? "economic",
      isRegistered: false,
      registeredAt: null,
      stripeRegistrationId: null,
    });
  }

  /**
   * Get all Stripe Tax registrations
   */
  async getStripeRegistrations(): Promise<Map<string, { id: string; state: string; active: boolean }>> {
    try {
      const registrations = await this.stripeClient.tax.registrations.list({ limit: 100 });
      
      const map = new Map<string, { id: string; state: string; active: boolean }>();
      
      for (const reg of registrations.data) {
        if (reg.country === 'US' && reg.country_options?.us?.state) {
          const state = reg.country_options.us.state;
          map.set(state, {
            id: reg.id,
            state,
            active: reg.status === 'active',
          });
        }
      }
      
      return map;
    } catch (error) {
      console.error('Failed to fetch Stripe registrations:', error);
      return new Map();
    }
  }

  /**
   * Deactivate all Stripe Tax registrations.
   * Stripe doesn't provide a global "off" switch, so we expire active/scheduled registrations.
   */
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
            await this.stripeClient.tax.registrations.update(reg.id, { expires_at: "now" });
            deactivated += 1;
          }
        }

        if (!regs.has_more) break;
        const last = regs.data[regs.data.length - 1];
        if (!last) break;
        startingAfter = last.id;
      }

      return deactivated;
    } catch (error: any) {
      console.error("Failed to deactivate Stripe Tax registrations:", error);
      throw new Error(error?.message ?? "Failed to deactivate Stripe Tax registrations");
    }
  }

  /**
   * Download tax documents for a specific period
   */
  async downloadTaxDocuments(params: {
    year: number;
    month?: number;
  }): Promise<{ url: string; expiresAt: number } | null> {
    try {
      // Stripe doesn't have direct tax report download API
      // Return null to indicate manual download needed
      return null;
    } catch (error) {
      console.error('Failed to download tax documents:', error);
      return null;
    }
  }
}
