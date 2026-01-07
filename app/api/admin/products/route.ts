import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService } from "@/services/product-service";
import { productCreateSchema } from "@/lib/validation/product";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);
    const tenantId = await ensureTenantId(session, supabase);

    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || undefined;
    const limitRaw = Number(searchParams.get("limit") ?? "100");
    const pageRaw = Number(searchParams.get("page") ?? "1");

    const category = searchParams.getAll("category");
    const condition = searchParams.getAll("condition");

    // Admin list should include out-of-stock so the admin tabs can show them.
    const includeOutOfStock =
      (searchParams.get("includeOutOfStock") ?? "1") === "1";

    const result = await service.listProducts({
      q,
      category: category.length ? category : undefined,
      condition: condition.length ? condition : undefined,
      limit: Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100,
      page: Number.isFinite(pageRaw) ? Math.max(pageRaw, 1) : 1,
      includeOutOfStock,
      tenantId,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/products (GET)",
    });
    return NextResponse.json(
      { error: "Failed to load products", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const body = await request.json().catch(() => null);
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const payload = {
      ...parsed.data,
      condition_note: parsed.data.condition_note ?? undefined,
      description: parsed.data.description ?? undefined,
    };

    const tenantId = await ensureTenantId(session, supabase);
    const product = await service.createProduct(payload, {
      userId: session.user.id,
      tenantId,
      marketplaceId: null,
      sellerId: null,
    });

    try {
      revalidateTag(`product:${product.id}`, "max");
      revalidateTag("products:list", "max");
    } catch (cacheError) {
      logError(cacheError, {
        layer: "cache",
        requestId,
        route: "/api/admin/products",
        event: "cache_revalidate_failed",
        productId: product.id,
      });
    }

    return NextResponse.json(product, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/products",
    });
    return NextResponse.json(
      { error: "Failed to create product", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
