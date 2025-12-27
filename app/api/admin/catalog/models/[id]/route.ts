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
    const model = await service.updateModel(params.id, {
      brandId: body.brandId,
      canonicalLabel: body.canonicalLabel,
      isActive: body.isActive,
      isVerified: body.isVerified,
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error("Admin models PATCH error:", error);
    const message = error instanceof Error ? error.message : "Failed to update model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
