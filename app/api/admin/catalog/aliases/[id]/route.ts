import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const service = new CatalogService(supabase);
    const alias = await service.updateAlias(params.id, {
      aliasLabel: body.aliasLabel,
      priority: body.priority,
      isActive: body.isActive,
    });

    return NextResponse.json(alias);
  } catch (error) {
    console.error("Admin aliases PATCH error:", error);
    const message = error instanceof Error ? error.message : "Failed to update alias";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
