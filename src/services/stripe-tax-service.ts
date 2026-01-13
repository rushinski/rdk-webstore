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
      amount: number; // in cents
      quantity: number;
      productId: string;
      category: string;
    }>;
    shippingCost?: number; // in cents
  }): Promise<{
    taxAmount: number; // in cents
    totalAmount: number; // in cents
    taxCalculationId: string | null;
  }> {
    // For pickup orders, use SC (home state)
    const state = params.customerAddress?.state ?? 'SC';
    
    const lineItems: Stripe.Tax.CalculationCreateParams.LineItem[] = params.lineItems.map(item => ({
      amount: item.amount,
      quantity: item.quantity ?? 1, // Add default
      reference: item.productId,
      tax_code: PRODUCT_TAX_CODES[item.category as keyof typeof PRODUCT_TAX_CODES] ?? 'txcd_99999999',
    }));

    // Add shipping as a line item if present
    if (params.shippingCost && params.shippingCost > 0) {
      lineItems.push({
        amount: params.shippingCost,
        quantity: 1,
        reference: 'shipping',
        tax_code: 'txcd_92010001', // Shipping tax code
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
            // Default to SC for pickup
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
      // Fallback to 0 tax on error
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0);
      return {
        taxAmount: 0,
        totalAmount: subtotal,
        taxCalculationId: null,
      };
    }
  }

  /**
   * Register a tax calculation as a transaction (after payment succeeds)
   */
  async createTaxTransaction(params: {
    taxCalculationId: string;
    reference: string; // order ID
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
   * Register for tax collection in a state
   */
  async registerState(params: {
    tenantId: string;
    stateCode: string;
    registrationType: 'physical' | 'economic';
  }): Promise<void> {
    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: params.registrationType,
      isRegistered: true,
      registeredAt: new Date().toISOString(),
    });

    // Note: Actual Stripe Tax registration would happen through their API
    // For now, we're tracking this in our database
  }

  /**
   * Unregister from tax collection in a state
   */
  async unregisterState(params: {
    tenantId: string;
    stateCode: string;
  }): Promise<void> {
    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: 'economic',
      isRegistered: false,
      registeredAt: null,
    });
  }

  /**
   * Set or update home state
   */
  async setHomeState(params: {
    tenantId: string;
    stateCode: string;
  }): Promise<void> {
    await this.taxSettingsRepo.upsert({
      tenantId: params.tenantId,
      homeState: params.stateCode,
    });

    // Home state is always physical nexus
    await this.nexusRepo.upsertRegistration({
      tenantId: params.tenantId,
      stateCode: params.stateCode,
      registrationType: 'physical',
      isRegistered: true,
      registeredAt: new Date().toISOString(),
    });
  }
}