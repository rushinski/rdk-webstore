// src/app/api/checkout/calculate-shipping/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { ProductRepository } from "@/repositories/product-repo";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";
import { calculateShippingSchema } from "@/lib/validation/checkout";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.json().catch(() => null);
    const parsed = calculateShippingSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { productIds } = parsed.data;
    const adminSupabase = createSupabaseAdminClient();
    const productsRepo = new ProductRepository(adminSupabase);
    const products = await productsRepo.getProductsForCheckout(productIds);

    if (products.length === 0) {
      return NextResponse.json({ shippingCost: 0, requestId }, { headers: { "Cache-Control": "no-store" } });
    }

    const tenantIds = new Set(products.map((p) => p.tenantId).filter(Boolean));
    if (tenantIds.size !== 1) {
      return NextResponse.json({ shippingCost: 0, requestId }, { headers: { "Cache-Control": "no-store" } });
    }

    const [tenantId] = [...tenantIds];
    const categories = [...new Set(products.map((p) => p.category))];
    const shippingDefaultsRepo = new ShippingDefaultsRepository(adminSupabase);
    const shippingDefaults = await shippingDefaultsRepo.getByCategories(tenantId!, categories);
    const maxCents = Math.max(...shippingDefaults.map((d) => Number(d.shipping_cost_cents ?? 0)), 0);

    return NextResponse.json(
      { shippingCost: maxCents / 100, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/checkout/calculate-shipping" });
    return NextResponse.json({ error: "Failed to calculate shipping", requestId }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}