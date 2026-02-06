// app/api/featured-items/route.ts
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeaturedItemsService } from "@/services/featured-items-service";
import { logError } from "@/lib/utils/log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const service = new FeaturedItemsService(supabase);

    const items = await service.getFeaturedItems();

    // Transform to a simpler format for the frontend
    const featured = items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      brand: item.product.brand,
      model: item.product.model,
      titleDisplay:
        item.product.title_raw ??
        item.product.title_display ??
        `${item.product.brand ?? ""} ${item.product.name ?? ""}`.trim(),
      category: item.product.category,
      primaryImage: item.product.images?.[0]?.url ?? null,
      minPrice: Math.min(...(item.product.variants?.map((v) => v.price_cents) ?? [0])),
      sortOrder: item.sort_order,
      // Include variant info for size display
      variants:
        item.product.variants?.map((v) => ({
          size_label: v.size_label,
          stock: v.stock,
        })) ?? [],
    }));

    return NextResponse.json({ featured });
  } catch (error) {
    logError(error, { layer: "api", endpoint: "GET /api/featured-items" });
    return NextResponse.json(
      { error: "Failed to fetch featured items", featured: [] },
      { status: 500 },
    );
  }
}
