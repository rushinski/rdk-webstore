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
    const group = await service.updateBrandGroup(params.id, {
      key: body.key,
      label: body.label,
      isActive: body.isActive,
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Admin brand groups PATCH error:", error);
    const message = error instanceof Error ? error.message : "Failed to update brand group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
