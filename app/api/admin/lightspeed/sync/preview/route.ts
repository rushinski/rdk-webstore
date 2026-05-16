import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lightspeedSyncPreviewSchema } from "@/lib/validation/admin";
import { logError } from "@/lib/utils/log";
import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedSyncRunsRepository } from "@/repositories/lightspeed-sync-runs-repo";
import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);

    const body = await request.json().catch(() => null);
    const parsed = lightspeedSyncPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const previewService = new LightspeedSyncPreviewService(
      new ProductRepository(supabase),
      new LightspeedLinksRepository(supabase),
      new LightspeedSyncRunsRepository(supabase),
    );

    const preview = await previewService.previewSync({
      tenantId,
      startedBy: session.user.id,
      sourceOfTruth: parsed.data.sourceOfTruth,
    });

    return NextResponse.json(
      { preview, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/lightspeed/sync/preview",
    });

    return NextResponse.json(
      { error: "Failed to build sync preview", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
