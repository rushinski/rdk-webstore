import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { CatalogService } from "@/services/catalog-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const querySchema = z.object({
  includeInactive: z.enum(["1"]).optional(),
  brandId: z.string().uuid().optional(),
});

const createModelSchema = z
  .object({
    brandId: z.string().uuid(),
    canonicalLabel: z.string().trim().min(1),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const parsed = querySchema.safeParse({
      includeInactive: request.nextUrl.searchParams.get("includeInactive") ?? undefined,
      brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const includeInactive = parsed.data.includeInactive === "1";
    const brandId = parsed.data.brandId ?? null;

    const service = new CatalogService(supabase);
    const models = await service.listModels(tenantId, brandId, includeInactive);

    return NextResponse.json(
      { models },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/models",
    });
    return NextResponse.json(
      { error: "Failed to load models", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json().catch(() => null);
    const parsed = createModelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const service = new CatalogService(supabase);
    const model = await service.createModel({
      tenantId,
      brandId: parsed.data.brandId,
      canonicalLabel: parsed.data.canonicalLabel,
      isActive: parsed.data.isActive ?? true,
      isVerified: parsed.data.isVerified ?? true,
    });

    return NextResponse.json(model, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/models",
    });
    return NextResponse.json(
      { error: "Failed to create model", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
