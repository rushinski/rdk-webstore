import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { CatalogService } from "@/services/catalog-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";
    const entityType = request.nextUrl.searchParams.get("entityType") as
      | "brand"
      | "model"
      | null;

    const service = new CatalogService(supabase);
    const aliases = await service.listAliases(
      tenantId,
      entityType ?? undefined,
      includeInactive
    );

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error("Admin aliases GET error:", error);
    return NextResponse.json({ error: "Failed to load aliases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json();

    if (!body?.aliasLabel || !body?.entityType) {
      return NextResponse.json(
        { error: "Alias label and entity type are required." },
        { status: 400 }
      );
    }

    if (body.entityType === "brand" && !body.brandId) {
      return NextResponse.json({ error: "Brand is required." }, { status: 400 });
    }

    if (body.entityType === "model" && !body.modelId) {
      return NextResponse.json({ error: "Model is required." }, { status: 400 });
    }

    const service = new CatalogService(supabase);
    const alias = await service.createAlias({
      tenantId,
      entityType: body.entityType,
      brandId: body.brandId ?? null,
      modelId: body.modelId ?? null,
      aliasLabel: body.aliasLabel,
      priority: body.priority ?? 0,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json(alias, { status: 201 });
  } catch (error) {
    console.error("Admin aliases POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create alias";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
