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
   */
  async registerState(params: {
    tenantId: string;
    stateCode: string;
    registrationType: 'physical' | 'economic';
  }): Promise<void> {
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
      
      // Still mark as registered locally even if Stripe fails
      await this.nexusRepo.upsertRegistration({
        tenantId: params.tenantId,
        stateCode: params.stateCode,
        registrationType: params.registrationType,
        isRegistered: true,
        registeredAt: new Date().toISOString(),
      });
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
   * Set or update home state with Stripe Tax
   */
  async setHomeState(params: {
    tenantId: string;
    stateCode: string;
  }): Promise<void> {
    // Update local settings
    await this.taxSettingsRepo.upsert({
      tenantId: params.tenantId,
      homeState: params.stateCode,
    });

    // Register home state as physical nexus with Stripe
    await this.registerState({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: 'physical',
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
}