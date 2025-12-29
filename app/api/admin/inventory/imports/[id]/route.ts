import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { InventoryImportRepository } from "@/repositories/inventory-import-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { id } = await params;
  const parsed = paramsSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new InventoryImportRepository(supabase);
    const importRow = await repo.getImportById(parsed.data.id);

    if (!importRow) {
      return NextResponse.json(
        { error: "Import not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(importRow, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/inventory/imports/:id",
    });
    return NextResponse.json(
      { error: "Failed to fetch import status", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
