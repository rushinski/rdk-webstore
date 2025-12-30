// app/api/store/products/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { StorefrontService } from "@/services/storefront-service";
import { storeProductsQuerySchema } from "@/lib/validation/storefront";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const searchParams = request.nextUrl.searchParams;

  const qParam = searchParams.get("q");
  const sortParam = searchParams.get("sort");
  const includeOutOfStockParam = searchParams.get("includeOutOfStock");
  const includeOutOfStockRequested =
    includeOutOfStockParam === "1" || includeOutOfStockParam === "true";
  let includeOutOfStock = false;
  if (includeOutOfStockRequested) {
    const session = await getServerSession();
    includeOutOfStock = session?.role === "admin";
  }

  const parsed = storeProductsQuerySchema.safeParse({
    q: qParam && qParam.trim().length > 0 ? qParam : undefined,
    category: searchParams.getAll("category").filter(Boolean),
    brand: searchParams.getAll("brand").filter(Boolean),
    model: searchParams.getAll("model").filter(Boolean),
    sizeShoe: searchParams.getAll("sizeShoe").filter(Boolean),
    sizeClothing: searchParams.getAll("sizeClothing").filter(Boolean),
    condition: searchParams.getAll("condition").filter(Boolean),
    sort: sortParam && sortParam.trim().length > 0 ? sortParam : "newest",
    page: Number.parseInt(searchParams.get("page") ?? "1", 10),
    limit: Number.parseInt(searchParams.get("limit") ?? "20", 10),
    includeOutOfStock,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const service = new StorefrontService(supabase);

    const result = await service.listProducts(parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/store/products",
    });
    return NextResponse.json(
      { error: "Failed to fetch products", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
