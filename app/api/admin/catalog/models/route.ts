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
    const brandId = request.nextUrl.searchParams.get("brandId");

    const service = new CatalogService(supabase);
    const models = await service.listModels(tenantId, brandId, includeInactive);

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Admin models GET error:", error);
    return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json();

    if (!body?.canonicalLabel || !body?.brandId) {
      return NextResponse.json(
        { error: "Brand and label are required." },
        { status: 400 }
      );
    }

    const service = new CatalogService(supabase);
    const model = await service.createModel({
      tenantId,
      brandId: body.brandId,
      canonicalLabel: body.canonicalLabel,
      isActive: body.isActive ?? true,
      isVerified: body.isVerified ?? true,
    });

    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    console.error("Admin models POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
