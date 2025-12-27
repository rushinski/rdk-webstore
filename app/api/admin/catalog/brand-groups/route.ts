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

    const service = new CatalogService(supabase);
    const groups = await service.listBrandGroups(tenantId, includeInactive);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Admin brand groups GET error:", error);
    return NextResponse.json({ error: "Failed to load brand groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json();

    if (!body?.key || !body?.label) {
      return NextResponse.json({ error: "Key and label are required." }, { status: 400 });
    }

    const service = new CatalogService(supabase);
    const group = await service.createBrandGroup({
      tenantId,
      key: body.key,
      label: body.label,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Admin brand groups POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create brand group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
