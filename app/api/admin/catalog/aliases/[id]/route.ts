// app/api/admin/catalog/aliases/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z
  .object({
    aliasLabel: z.string().trim().min(1).optional(),
    priority: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export async function PATCH(
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

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const service = new CatalogService(supabase);
    const alias = await service.updateAlias(paramsParsed.data.id, {
      aliasLabel: parsed.data.aliasLabel,
      priority: parsed.data.priority,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json(alias, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/aliases/:id",
    });
    return NextResponse.json(
      { error: "Failed to update alias", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
