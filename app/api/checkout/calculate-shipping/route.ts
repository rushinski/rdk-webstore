// src/app/api/checkout/calculate-shipping/route.ts (NEW)

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductRepository } from "@/repositories/product-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds array required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const productsRepo = new ProductRepository(supabase);

    // Fetch products to get categories
    const products = await productsRepo.getProductsForCheckout(productIds);
    
    if (products.length === 0) {
      return NextResponse.json({ shippingCost: 0 });
    }

    const categories = [...new Set(products.map(p => p.category))];
    const tenantIds = new Set(
      products.map(p => p.tenantId).filter((id): id is string => Boolean(id))
    );
    
    if (tenantIds.size !== 1) {
      return NextResponse.json({ shippingCost: 0 });
    }

    const [tenantId] = [...tenantIds];
    const shippingDefaultsRepo = new ShippingDefaultsRepository(supabase);
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(tenantId, categories);

    // Calculate max shipping (flat rate approach)
    const maxShipping = Math.max(
      ...shippingDefaults.map(d => Number(d.shipping_cost_cents ?? 0)),
      0
    );

    return NextResponse.json(
      { shippingCost: maxShipping },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      route: "/api/checkout/calculate-shipping",
    });

    return NextResponse.json(
      { error: "Failed to calculate shipping" },
      { status: 500 }
    );
  }
}