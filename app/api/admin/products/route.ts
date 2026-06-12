// app/api/admin/products/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductService } from "@/services/product-service";
import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";
import { adminProductsQuerySchema, productCreateSchema } from "@/lib/validation/product";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const bulkActionSchema = z
  .object({
    action: z.enum(["archive", "restore", "delete"]),
    selectionMode: z.enum(["ids", "filtered"]),
    ids: z.array(z.string().uuid()).optional(),
    filters: z
      .object({
        q: z.string().trim().min(1).optional(),
        category: z.array(z.string()).optional(),
        condition: z.array(z.string()).optional(),
        stockStatus: z.enum(["in_stock", "out_of_stock", "archived", "all"]).optional(),
      })
      .optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);
    const tenantId = await ensureTenantId(session, supabase);

    const { searchParams } = new URL(request.url);

    const parsedQuery = adminProductsQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      category: searchParams.getAll("category").filter(Boolean),
      condition: searchParams.getAll("condition").filter(Boolean),
      includeOutOfStock: searchParams.get("includeOutOfStock") ?? undefined,
      stockStatus: searchParams.get("stockStatus") ?? undefined,
      searchMode: searchParams.get("searchMode") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          issues: parsedQuery.error.format(),
          requestId,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const {
      q,
      limit,
      page,
      category,
      condition,
      includeOutOfStock,
      stockStatus,
      searchMode,
    } = parsedQuery.data;
    const effectiveSearchMode = searchMode ?? "inventory";

    const result = await service.listProducts({
      q,
      category: category && category.length ? category : undefined,
      condition: condition && condition.length ? condition : undefined,
      limit,
      page,
      includeOutOfStock,
      stockStatus,
      tenantId,
      searchMode: effectiveSearchMode,
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
      { status: 500, headers: { "Cache-Control": "no-store" } },
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
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const payload = {
      ...parsed.data,
      description: parsed.data.description ?? undefined,
      shipping_price_cents: parsed.data.shipping_price_cents ?? null,
    };

    const tenantId = await ensureTenantId(session, supabase);
    const product = await service.createProduct(payload, {
      userId: session.user.id,
      tenantId,
      sellerId: null,
    });
    const lightspeedSyncService = new LightspeedProductSyncService(supabase);

    try {
      await lightspeedSyncService.syncWebsiteProduct(product.id, {
        tenantId,
        source: "create",
      });
    } catch (syncError) {
      await service.deleteProduct(product.id).catch(() => undefined);
      throw syncError;
    }

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
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const service = new ProductService(supabase);

    const body = await request.json().catch(() => null);
    const parsed = bulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    let payload: Record<string, unknown>;

    if (parsed.data.action === "archive") {
      const result =
        parsed.data.selectionMode === "ids"
          ? await service.archiveProductsByIds(parsed.data.ids ?? [], tenantId)
          : await service.archiveProductsByFilters(tenantId, {
              q: parsed.data.filters?.q,
              category: parsed.data.filters?.category,
              condition: parsed.data.filters?.condition,
              stockStatus: parsed.data.filters?.stockStatus,
            });
      payload = { success: true, archivedCount: result.archivedCount, requestId };
    } else if (parsed.data.action === "restore") {
      const result =
        parsed.data.selectionMode === "ids"
          ? await service.restoreProductsByIds(parsed.data.ids ?? [], tenantId)
          : await service.restoreProductsByFilters(tenantId, {
              q: parsed.data.filters?.q,
              category: parsed.data.filters?.category,
              condition: parsed.data.filters?.condition,
              stockStatus: parsed.data.filters?.stockStatus,
            });
      payload = { success: true, restoredCount: result.restoredCount, requestId };
    } else {
      const lightspeedSyncService = new LightspeedProductSyncService(supabase);
      const result =
        parsed.data.selectionMode === "ids"
          ? await service.deleteProductsByIds(parsed.data.ids ?? [], tenantId, {
              onBeforeDelete: async (productId) => {
                await lightspeedSyncService.deleteWebsiteProduct({
                  tenantId,
                  productId,
                  deletedByUserId: session.user.id,
                });
              },
            })
          : await service.deleteProductsByFilters(
              tenantId,
              {
                q: parsed.data.filters?.q,
                category: parsed.data.filters?.category,
                condition: parsed.data.filters?.condition,
                stockStatus: parsed.data.filters?.stockStatus,
              },
              {
                onBeforeDelete: async (productId) => {
                  await lightspeedSyncService.deleteWebsiteProduct({
                    tenantId,
                    productId,
                    deletedByUserId: session.user.id,
                  });
                },
              },
            );
      payload = {
        success: true,
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
        requestId,
      };
    }

    try {
      revalidateTag("products:list", "max");
    } catch (cacheError) {
      logError(cacheError, {
        layer: "cache",
        requestId,
        route: "/api/admin/products",
        event: "cache_revalidate_failed",
      });
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/products (PATCH)",
    });
    return NextResponse.json(
      { error: "Failed to process selected products", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
