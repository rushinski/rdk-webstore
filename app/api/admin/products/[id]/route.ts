// app/api/admin/products/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService } from "@/services/product-service";
import { productCreateSchema } from "@/lib/validation/product";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const { id } = await params;
    const paramsParsed = paramsSchema.safeParse({ id });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const tenantId = await ensureTenantId(session, supabase);
    const product = await service.updateProduct(paramsParsed.data.id, parsed.data, {
      userId: session.user.id,
      tenantId,
    });

    try {
      revalidateTag(`product:${product.id}`, "max");
      revalidateTag("products:list", "max");
    } catch (cacheError) {
      logError(cacheError, {
        layer: "cache",
        requestId,
        route: "/api/admin/products/:id",
        event: "cache_revalidate_failed",
        productId: product.id,
      });
    }

    return NextResponse.json(product, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/products/:id",
    });
    return NextResponse.json(
      { error: "Failed to update product", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const { id } = await params;
    const paramsParsed = paramsSchema.safeParse({ id });
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const service = new ProductService(supabase);
    await service.deleteProduct(paramsParsed.data.id);

    try {
      revalidateTag(`product:${paramsParsed.data.id}`, "max");
      revalidateTag("products:list", "max");
    } catch (cacheError) {
      logError(cacheError, {
        layer: "cache",
        requestId,
        route: "/api/admin/products/:id",
        event: "cache_revalidate_failed",
        productId: paramsParsed.data.id,
      });
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/products/:id",
    });
    return NextResponse.json(
      { error: "Failed to delete product", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
