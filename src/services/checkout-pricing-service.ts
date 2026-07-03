// src/services/checkout-pricing-service.ts
//
// Single source of truth for subtotal, shipping, tax, and total calculations.
// Used by create-payment-intent, update-fulfillment, and confirm-payment.
// Eliminates the duplicated pricing logic that was scattered across 3+ files.

import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
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
  lineItems: ResolvedLineItem[];
  pricing: CheckoutPricing;
}

export class CheckoutPricingService {
  private productsRepo: ProductRepository;
  private shippingDefaultsRepo: ShippingDefaultsRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productsRepo = new ProductRepository(supabase);
    this.shippingDefaultsRepo = new ShippingDefaultsRepository(supabase);
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

    // 3. Build line items with stock validation
    const lineItems = this.buildLineItems(items, productMap);

    // 4. Calculate pricing
    const pricing = await this.calculatePricing({
      tenantId,
      lineItems,
      fulfillment,
      shippingAddress,
    });

    return { tenantId, lineItems, pricing };
  }

  /**
   * Recalculate pricing for an existing order (fulfillment/address change).
   * Skips product fetch and uses pre-resolved items.
   */
  async recalculate(params: {
    tenantId: string;
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
        model: string | null;
        category: string;
        condition: string;
        shippingPriceCents: number | null;
        variants: Array<{
          id: string;
          sku: string;
          salePriceCents: number;
          unitCostCents: number;
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

      const unitPrice = Number(variant.salePriceCents ?? 0) / 100;
      const unitCost = Number(variant.unitCostCents ?? 0) / 100;

      return {
        productId: item.productId,
        variantId: item.variantId,
        variantSku: variant.sku,
        sizeLabel: variant.sizeLabel,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        lineTotal: unitPrice * item.quantity,
        titleDisplay: product.titleDisplay,
        brand: product.brand,
        name: product.name,
        model: product.model,
        category: product.category,
        condition: product.condition,
        shippingPriceCents: product.shippingPriceCents,
      };
    });
  }

  private async calculatePricing(params: {
    tenantId: string;
    lineItems: ResolvedLineItem[];
    fulfillment: FulfillmentMethod;
    shippingAddress?: ShippingAddressPayload | null;
  }): Promise<CheckoutPricing> {
    const { tenantId, lineItems, fulfillment, shippingAddress } = params;

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
      const costs = lineItems.map((li) => {
        const categoryDefault = shippingMap.get(li.category) ?? 0;
        return (li.shippingPriceCents ?? categoryDefault) / 100;
      });
      shipping = Math.max(...costs, 0);
    }

    const destinationState =
      fulfillment === "ship"
        ? (shippingAddress?.state?.trim().toUpperCase() ?? null)
        : null;
    const destinationZip =
      fulfillment === "ship" ? (shippingAddress?.postal_code?.trim() ?? null) : null;
    const tax = 0;
    const taxCalcId: string | null = null;
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
      taxCalculationId: taxCalcId,
      destinationState,
      destinationZip,
      fulfillment,
    });

    return {
      subtotal,
      shipping,
      tax,
      total,
      taxCalculationId: taxCalcId,
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
