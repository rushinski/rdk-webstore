import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { CatalogService } from "@/services/catalog-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const querySchema = z.object({
  includeInactive: z.enum(["1"]).optional(),
});

const createBrandGroupSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const parsed = querySchema.safeParse({
      includeInactive: request.nextUrl.searchParams.get("includeInactive") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const includeInactive = parsed.data.includeInactive === "1";

    const service = new CatalogService(supabase);
    const groups = await service.listBrandGroups(tenantId, includeInactive);

    return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/brand-groups",
    });
    return NextResponse.json(
      { error: "Failed to load brand groups", requestId },
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
    const parsed = createBrandGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const service = new CatalogService(supabase);
    const group = await service.createBrandGroup({
      tenantId,
      key: parsed.data.key,
      label: parsed.data.label,
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json(group, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/brand-groups",
    });
    return NextResponse.json(
      { error: "Failed to create brand group", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
