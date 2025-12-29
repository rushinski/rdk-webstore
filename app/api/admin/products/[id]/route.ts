// app/api/admin/products/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
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
  { params }: { params: { id: string } }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const service = new ProductService(supabase);

    const paramsParsed = paramsSchema.safeParse(params);
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
  { params }: { params: { id: string } }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const paramsParsed = paramsSchema.safeParse(params);
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const service = new ProductService(supabase);
    await service.deleteProduct(paramsParsed.data.id);

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
