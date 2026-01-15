// src/services/stripe-tax-service.ts

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

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.nexusRepo = new NexusRepository(supabase);
    this.taxSettingsRepo = new TaxSettingsRepository(supabase);
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
      const settings = await stripe.tax.settings.retrieve();
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
  }): Promise<void> {
    try {
      // Update Stripe Tax Settings with head office address
      const taxSettings = await stripe.tax.settings.update({
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
        businessName: params.businessName ?? null,
        stripeTaxSettingsId: taxSettings.status === 'active' ? 'configured' : null,
      });

      // Automatically register home state as physical nexus
      await this.registerState({
        tenantId: params.tenantId,
        stateCode: params.stateCode,
        registrationType: 'physical',
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
      const settings = await stripe.tax.settings.retrieve();
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
  }): Promise<{
    taxAmount: number;
    totalAmount: number;
    taxCalculationId: string | null;
  }> {
    const state = params.customerAddress?.state ?? 'SC';
    
    const lineItems: Stripe.Tax.CalculationCreateParams.LineItem[] = params.lineItems.map(item => ({
      amount: item.amount,
      quantity: item.quantity ?? 1,
      reference: item.productId,
      tax_code: PRODUCT_TAX_CODES[item.category as keyof typeof PRODUCT_TAX_CODES] ?? 'txcd_99999999',
    }));

    if (params.shippingCost && params.shippingCost > 0) {
      lineItems.push({
        amount: params.shippingCost,
        quantity: 1,
        reference: 'shipping',
        tax_code: 'txcd_92010001',
      });
    }

    try {
      const calculation = await stripe.tax.calculations.create({
        currency: params.currency.toLowerCase(),
        line_items: lineItems,
        customer_details: {
          address: params.customerAddress ? {
            line1: params.customerAddress.line1,
            line2: params.customerAddress.line2 ?? undefined,
            city: params.customerAddress.city,
            state: params.customerAddress.state,
            postal_code: params.customerAddress.postal_code,
            country: params.customerAddress.country,
          } : {
            line1: '123 Main St',
            city: 'Charleston',
            state: 'SC',
            postal_code: '29401',
            country: 'US',
          },
          address_source: 'shipping',
        },
        expand: ['line_items'],
      });

      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0);
      const taxAmount = calculation.tax_amount_exclusive ?? 0;
      const totalAmount = subtotal + taxAmount;

      return {
        taxAmount,
        totalAmount,
        taxCalculationId: calculation.id,
      };
    } catch (error) {
      console.error('Stripe tax calculation error:', error);
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0);
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
      const transaction = await stripe.tax.transactions.createFromCalculation({
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

    try {
      // Create Stripe Tax registration
      const registration = await stripe.tax.registrations.create({
        country: 'US',
        country_options: {
          us: {
            type: 'state_sales_tax',
            state: params.stateCode,
          },
        },
        active_from: 'now',
      });

      // Store registration in database
      await this.nexusRepo.upsertRegistration({
        tenantId: params.tenantId,
        stateCode: params.stateCode,
        registrationType: params.registrationType,
        isRegistered: true,
        registeredAt: new Date().toISOString(),
        stripeRegistrationId: registration.id,
      });
    } catch (error: any) {
      console.error('Stripe tax registration error:', error);
      throw error;
    }
  }

  /**
   * Unregister from tax collection with Stripe Tax
   */
  async unregisterState(params: {
    tenantId: string;
    stateCode: string;
  }): Promise<void> {
    const registration = await this.nexusRepo.getRegistration(params.tenantId, params.stateCode);
    
    if (registration?.stripe_registration_id) {
      try {
        await stripe.tax.registrations.update(registration.stripe_registration_id, {
          expires_at: 'now',
        });
      } catch (error) {
        console.error('Stripe tax unregistration error:', error);
      }
    }

    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: 'economic',
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
      const registrations = await stripe.tax.registrations.list({ limit: 100 });
      
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
   * Download tax documents for a specific period
   */
  async downloadTaxDocuments(params: {
    year: number;
    month?: number;
  }): Promise<{ url: string; expiresAt: number } | null> {
    try {
      // Create a report run for the specified period
      const startDate = new Date(params.year, params.month ? params.month - 1 : 0, 1);
      const endDate = params.month 
        ? new Date(params.year, params.month, 0)
        : new Date(params.year, 11, 31);

      // Stripe doesn't have direct tax report download API
      // Return null to indicate manual download needed
      return null;
    } catch (error) {
      console.error('Failed to download tax documents:', error);
      return null;
    }
  }
}