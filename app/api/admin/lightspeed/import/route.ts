import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import { LightspeedManualImportService } from "@/services/lightspeed-manual-import-service";

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const service = new LightspeedManualImportService(supabase);
    const result = await service.importProducts({ tenantId });

    return NextResponse.json(
      { result, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      route: "/api/admin/lightspeed/import",
      requestId,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import Lightspeed products",
        requestId,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
