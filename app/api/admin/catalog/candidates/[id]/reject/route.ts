import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const paramsParsed = paramsSchema.safeParse(params);
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: "Invalid params", issues: paramsParsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const service = new CatalogService(supabase);
    const candidate = await service.rejectCandidate(paramsParsed.data.id);

    return NextResponse.json(candidate, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/catalog/candidates/:id/reject",
    });
    return NextResponse.json(
      { error: "Failed to reject candidate", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
