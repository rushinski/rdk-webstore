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
    const brand = await service.updateBrand(params.id, {
      groupId: body.groupId,
      canonicalLabel: body.canonicalLabel,
      isActive: body.isActive,
      isVerified: body.isVerified,
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Admin brands PATCH error:", error);
    const message = error instanceof Error ? error.message : "Failed to update brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
