import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { CatalogService } from "@/services/catalog-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const body = await request.json();

    const service = new CatalogService(supabase);
    const candidate = await service.acceptCandidate({
      id: params.id,
      tenantId,
      groupId: body?.groupId ?? null,
      canonicalLabel: body?.canonicalLabel,
    });

    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Admin candidate accept error:", error);
    const message = error instanceof Error ? error.message : "Failed to accept candidate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
