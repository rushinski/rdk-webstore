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
    const groupId = request.nextUrl.searchParams.get("groupId");

    const service = new CatalogService(supabase);
    const brands = await service.listBrands(tenantId, groupId, includeInactive);

    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Admin brands GET error:", error);
    return NextResponse.json({ error: "Failed to load brands" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json();

    if (!body?.canonicalLabel || !body?.groupId) {
      return NextResponse.json(
        { error: "Group and label are required." },
        { status: 400 }
      );
    }

    const service = new CatalogService(supabase);
    const brand = await service.createBrand({
      tenantId,
      groupId: body.groupId,
      canonicalLabel: body.canonicalLabel,
      isActive: body.isActive ?? true,
      isVerified: body.isVerified ?? true,
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Admin brands POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
