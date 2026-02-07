// src/services/checkout-pricing-service.ts
//
// Single source of truth for subtotal, shipping, tax, and total calculations.
// Used by create-payment-intent, update-fulfillment, and confirm-payment.
// Eliminates the duplicated pricing logic that was scattered across 3+ files.

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { log } from "@/lib/utils/log";
import type {
  CheckoutItem,
  CheckoutPricing,
  FulfillmentMethod,
  ResolvedLineItem,
  ShippingAddressPayload,
} from "@/types/domain/checkout";

export interface ResolvedCheckout {
  tenantId: string;
  stripeAccountId: string;
  lineItems: ResolvedLineItem[];
  pricing: CheckoutPricing;
}

export class CheckoutPricingService {
  private productsRepo: ProductRepository;
  private shippingDefaultsRepo: ShippingDefaultsRepository;
  private taxSettingsRepo: TaxSettingsRepository;
  private profilesRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productsRepo = new ProductRepository(supabase);
    this.shippingDefaultsRepo = new ShippingDefaultsRepository(supabase);
    this.taxSettingsRepo = new TaxSettingsRepository(supabase);
    this.profilesRepo = new ProfileRepository(supabase);
  }

  /**
   * Resolve cart items into validated line items with full pricing,
   * including shipping and tax calculations.
   */
  async resolve(params: {
    items: CheckoutItem[];
    fulfillment: FulfillmentMethod;
    shippingAddress?: ShippingAddressPayload | null;
  }): Promise<ResolvedCheckout> {
    const { items, fulfillment, shippingAddress } = params;

    // 1. Fetch and validate products
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      throw new CheckoutError("NO_PRODUCTS", "No valid products found");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Validate single tenant
    const tenantIds = new Set(
      products.map((p) => p.tenantId).filter((id): id is string => Boolean(id)),
    );
    if (tenantIds.size !== 1) {
      throw new CheckoutError("MULTI_TENANT", "All items must be from the same seller");
    }
    const [tenantId] = [...tenantIds];

    // 3. Get tenant's Stripe Connect account
    const stripeAccountId = await this.profilesRepo.getStripeAccountIdForTenant(tenantId);
    if (!stripeAccountId) {
      throw new CheckoutError(
        "NO_STRIPE_ACCOUNT",
        "Seller payment account not configured",
      );
    }

    // 4. Build line items with stock validation
    const lineItems = this.buildLineItems(items, productMap);

    // 5. Calculate pricing
    const pricing = await this.calculatePricing({
      tenantId,
      stripeAccountId,
      lineItems,
      fulfillment,
      shippingAddress,
    });

    return { tenantId, stripeAccountId, lineItems, pricing };
  }

  /**
   * Recalculate pricing for an existing order (fulfillment/address change).
   * Skips product fetch and uses pre-resolved items.
   */
  async recalculate(params: {
    tenantId: string;
    stripeAccountId: string;
    lineItems: ResolvedLineItem[];
    fulfillment: FulfillmentMethod;
    shippingAddress?: ShippingAddressPayload | null;
  }): Promise<CheckoutPricing> {
    return this.calculatePricing(params);
  }

  // ---------- Private ----------

  private buildLineItems(
    items: CheckoutItem[],
    productMap: Map<
      string,
      {
        id: string;
        titleDisplay: string;
        brand: string;
        name: string;
        category: string;
        variants: Array<{
          id: string;
          priceCents: number;
          costCents: number | null;
          stock: number;
          sizeLabel: string;
        }>;
      }
    >,
  ): ResolvedLineItem[] {
    return items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new CheckoutError(
          "PRODUCT_NOT_FOUND",
          `Product not found: ${item.productId}`,
        );
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new CheckoutError(
          "VARIANT_NOT_FOUND",
          `Variant not found: ${item.variantId}`,
        );
      }

      if (variant.stock < item.quantity) {
        throw new CheckoutError(
          "INSUFFICIENT_STOCK",
          `${product.titleDisplay} (${variant.sizeLabel}) is out of stock`,
        );
      }

      const unitPrice = Number(variant.priceCents ?? 0) / 100;
      const unitCost = Number(variant.costCents ?? 0) / 100;

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        lineTotal: unitPrice * item.quantity,
        titleDisplay: product.titleDisplay,
        brand: product.brand,
        name: product.name,
        category: product.category,
      };
    });
  }

  private async calculatePricing(params: {
    tenantId: string;
    stripeAccountId: string;
    lineItems: ResolvedLineItem[];
    fulfillment: FulfillmentMethod;
    shippingAddress?: ShippingAddressPayload | null;
  }): Promise<CheckoutPricing> {
    const { tenantId, stripeAccountId, lineItems, fulfillment, shippingAddress } = params;

    const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

    // Shipping
    const categories = [...new Set(lineItems.map((li) => li.category))];
    const shippingDefaults = await this.shippingDefaultsRepo.getByCategories(
      tenantId,
      categories,
    );
    const shippingMap = new Map(
      shippingDefaults.map((r) => [r.category, Number(r.shipping_cost_cents ?? 0)]),
    );

    let shipping = 0;
    if (fulfillment === "ship") {
      const costs = lineItems.map((li) => (shippingMap.get(li.category) ?? 0) / 100);
      shipping = Math.max(...costs, 0);
    }

    // Tax (only if tenant has opted in)
    const taxSettings = await this.taxSettingsRepo.getByTenant(tenantId);
    const taxEnabled = taxSettings?.tax_enabled ?? false;
    const homeState = (taxSettings?.home_state ?? "SC").trim().toUpperCase();
    const taxCodeOverrides =
      taxSettings?.tax_code_overrides &&
      typeof taxSettings.tax_code_overrides === "object"
        ? (taxSettings.tax_code_overrides as Record<string, string>)
        : {};

    if (!taxEnabled) {
      const total = subtotal + shipping;
      return {
        subtotal,
        shipping,
        tax: 0,
        total,
        taxCalculationId: null,
        customerState: null,
      };
    }

    // Determine destination state and customer address
    const destinationState =
      fulfillment === "pickup"
        ? homeState
        : (shippingAddress?.state?.trim().toUpperCase() ?? null);

    // Use the Connect account's Stripe Tax (direct charge means tax lives on Connect)
    const taxService = new StripeTaxService(this.supabase, stripeAccountId);
    const stripeRegistrations = destinationState
      ? await taxService.getStripeRegistrations()
      : new Map<string, { id: string; state: string; active: boolean }>();

    const hasRegistration = destinationState
      ? (stripeRegistrations.get(destinationState)?.active ?? false)
      : false;

    let customerAddress: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null = null;

    if (fulfillment === "ship" && shippingAddress) {
      customerAddress = {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 ?? null,
        city: shippingAddress.city,
        state: shippingAddress.state.trim().toUpperCase(),
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      };
    } else if (fulfillment === "pickup") {
      const officeAddr = await taxService.getHeadOfficeAddress();
      customerAddress = officeAddr ?? {
        line1: "123 Main St",
        city: "Charleston",
        state: homeState,
        postal_code: "29401",
        country: "US",
      };
    }

    const taxCalc =
      hasRegistration && customerAddress
        ? await taxService.calculateTax({
            currency: "usd",
            customerAddress,
            lineItems: lineItems.map((li) => ({
              amount: Math.round(li.unitPrice * 100),
              quantity: li.quantity,
              productId: li.productId,
              category: li.category,
            })),
            shippingCost: Math.round(shipping * 100),
            taxCodes: taxCodeOverrides,
            taxEnabled: true,
          })
        : {
            taxAmount: 0,
            totalAmount: Math.round((subtotal + shipping) * 100),
            taxCalculationId: null,
          };

    const tax = taxCalc.taxAmount / 100;
    const total = subtotal + shipping + tax;

    log({
      level: "info",
      layer: "service",
      message: "checkout_pricing_calculated",
      tenantId,
      subtotal,
      shipping,
      tax,
      total,
      taxCalculationId: taxCalc.taxCalculationId,
      destinationState,
      fulfillment,
    });

    return {
      subtotal,
      shipping,
      tax,
      total,
      taxCalculationId: taxCalc.taxCalculationId,
      customerState: destinationState,
    };
  }
}

// ---------- Checkout-specific error ----------

export class CheckoutError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}
