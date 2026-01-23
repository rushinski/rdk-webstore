import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { CatalogService } from "@/services/catalog-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const querySchema = z.object({
  includeInactive: z.enum(["1"]).optional(),
  entityType: z.enum(["brand", "model"]).optional(),
});

const aliasSchema = z.discriminatedUnion("entityType", [
  z
    .object({
      entityType: z.literal("brand"),
      brandId: z.string().uuid(),
      modelId: z.string().uuid().nullable().optional(),
      aliasLabel: z.string().trim().min(1),
      priority: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      entityType: z.literal("model"),
      modelId: z.string().uuid(),
      brandId: z.string().uuid().nullable().optional(),
      aliasLabel: z.string().trim().min(1),
      priority: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
]);

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const parsed = querySchema.safeParse({
      includeInactive: request.nextUrl.searchParams.get("includeInactive") ?? undefined,
      entityType: request.nextUrl.searchParams.get("entityType") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const includeInactive = parsed.data.includeInactive === "1";
    const entityType = parsed.data.entityType ?? undefined;

    const service = new CatalogService(supabase);
    const aliases = await service.listAliases(
      tenantId,
      entityType ?? undefined,
      includeInactive,
    );

    return NextResponse.json({ aliases }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/aliases",
    });
    return NextResponse.json(
      { error: "Failed to load aliases", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json().catch(() => null);
    const parsed = aliasSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const service = new CatalogService(supabase);
    const alias = await service.createAlias({
      tenantId,
      entityType: parsed.data.entityType,
      brandId: parsed.data.brandId ?? null,
      modelId: parsed.data.modelId ?? null,
      aliasLabel: parsed.data.aliasLabel,
      priority: parsed.data.priority ?? 0,
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json(alias, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/aliases",
    });
    return NextResponse.json(
      { error: "Failed to create alias", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
