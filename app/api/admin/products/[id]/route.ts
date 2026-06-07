// app/api/admin/products/[id]/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService, type ProductCreateInput } from "@/services/product-service";
import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";
import { productCreateSchema } from "@/lib/validation/product";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import type { ProductWithDetails } from "@/types/domain/product";

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

function toProductWriteInput(product: ProductWithDetails): ProductCreateInput {
  return {
    name: product.name,
    category: product.category,
    condition: product.condition,
    size_type: product.size_type,
    description: product.description ?? undefined,
    shipping_price_cents: product.shipping_price_cents ?? null,
    go_live_at: product.go_live_at ?? undefined,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size_label: variant.size_label,
      sale_price_cents: variant.sale_price_cents,
      stock: variant.stock,
      unit_cost_cents: variant.unit_cost_cents ?? 0,
      sort_order: variant.sort_order ?? 0,
    })),
    images: product.images.map((image) => ({
      url: image.url,
      sort_order: image.sort_order,
      is_primary: image.is_primary,
    })),
    tags: product.tags.map((tag) => ({
      label: tag.label,
      group_key: tag.group_key,
    })),
    excluded_auto_tag_keys: product.excluded_auto_tag_keys ?? [],
  };
}

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

    const tenantId = await ensureTenantId(session, supabase);
    const action = request.nextUrl.searchParams.get("action");

    if (action === "archive") {
      const result = await service.archiveProduct(paramsParsed.data.id, tenantId);

      try {
        revalidateTag(`product:${paramsParsed.data.id}`, "max");
        revalidateTag("products:list", "max");
      } catch (cacheError) {
        logError(cacheError, {
          layer: "cache",
          requestId,
          route: "/api/admin/products/:id?action=archive",
          event: "cache_revalidate_failed",
          productId: paramsParsed.data.id,
        });
      }

      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (action === "restore") {
      const result = await service.restoreProduct(paramsParsed.data.id, tenantId);

      try {
        revalidateTag(`product:${paramsParsed.data.id}`, "max");
        revalidateTag("products:list", "max");
      } catch (cacheError) {
        logError(cacheError, {
          layer: "cache",
          requestId,
          route: "/api/admin/products/:id?action=restore",
          event: "cache_revalidate_failed",
          productId: paramsParsed.data.id,
        });
      }

      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
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
      description: parsed.data.description ?? undefined,
      shipping_price_cents: parsed.data.shipping_price_cents ?? null,
    };
    const previousProduct = await service.getProductById(paramsParsed.data.id, {
      tenantId,
      includeOutOfStock: true,
      includeUnpublished: true,
      archivedStatus: "all",
    });
    if (!previousProduct) {
      return NextResponse.json(
        { error: "Product not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const product = await service.updateProduct(paramsParsed.data.id, payload, {
      userId: session.user.id,
      tenantId,
    });
    const lightspeedSyncService = new LightspeedProductSyncService(supabase);

    try {
      await lightspeedSyncService.syncWebsiteProduct(product.id, {
        tenantId,
        source: "update",
      });
    } catch (syncError) {
      await service
        .updateProduct(paramsParsed.data.id, toProductWriteInput(previousProduct), {
          userId: session.user.id,
          tenantId,
        })
        .catch(() => undefined);
      throw syncError;
    }

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
    const session = await requireAdminApi();
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
    const tenantId = await ensureTenantId(session, supabase);
    const lightspeedSyncService = new LightspeedProductSyncService(supabase);
    await lightspeedSyncService.deleteWebsiteProduct({
      tenantId,
      productId: paramsParsed.data.id,
    });
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
            "Cannot delete this product because it is referenced by existing orders.",
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
