// app/api/admin/products/[id]/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService } from "@/services/product-service";
import { productCreateSchema } from "@/lib/validation/product";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const extractErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.details === "string" && record.details.trim()) {
      return record.details;
    }
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return null;
};

const isForeignKeyViolation = (error: unknown, constraintName?: string): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  if (record.code !== "23503") {
    return false;
  }

  if (!constraintName) {
    return true;
  }

  const details = typeof record.details === "string" ? record.details : "";
  const message = typeof record.message === "string" ? record.message : "";
  return details.includes(constraintName) || message.includes(constraintName);
};

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const payload = {
      ...parsed.data,
      condition_note: parsed.data.condition_note ?? undefined,
      description: parsed.data.description ?? undefined,
    };
    const tenantId = await ensureTenantId(session, supabase);
    const product = await service.updateProduct(paramsParsed.data.id, payload, {
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
    const message = extractErrorMessage(error) ?? "Failed to update product";
    return NextResponse.json(
      { error: message, requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const service = new ProductService(supabase);
    const result = await service.deleteProduct(paramsParsed.data.id);

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
      { success: true, archived: result.archived },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/products/:id",
    });
    if (isForeignKeyViolation(error, "order_items_product_id_fkey")) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this product because it is referenced by existing orders. Archive it instead.",
          requestId,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        {
          error: "Cannot delete this product because it is still referenced.",
          requestId,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const message = extractErrorMessage(error) ?? "Failed to delete product";
    return NextResponse.json(
      { error: message, requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
