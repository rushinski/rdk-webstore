// app/api/store/products/[id]/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { StorefrontService } from "@/services/storefront-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { id } = await params;
  const parsed = paramsSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const service = new StorefrontService(supabase);
    const includeOutOfStockParam = request.nextUrl.searchParams.get("includeOutOfStock");
    const includeOutOfStockRequested =
      includeOutOfStockParam === "1" || includeOutOfStockParam === "true";
    let includeOutOfStock = false;
    if (includeOutOfStockRequested) {
      const session = await getServerSession();
      includeOutOfStock = session?.role === "admin";
    }
    const product = await service.getProductById(parsed.data.id, { includeOutOfStock });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(product, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/store/products/:id",
    });
    return NextResponse.json(
      { error: "Failed to fetch product", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
