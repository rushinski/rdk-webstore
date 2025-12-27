import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();

    const service = new CatalogService(supabase);
    const candidate = await service.rejectCandidate(params.id);

    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Admin candidate reject error:", error);
    const message = error instanceof Error ? error.message : "Failed to reject candidate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
