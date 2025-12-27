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
    const status = request.nextUrl.searchParams.get("status") ?? undefined;

    const service = new CatalogService(supabase);
    const candidates = await service.listCandidates(tenantId, status || undefined);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Admin candidates GET error:", error);
    return NextResponse.json({ error: "Failed to load candidates" }, { status: 500 });
  }
}
