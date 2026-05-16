import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lightspeedSyncApplySchema } from "@/lib/validation/admin";
import { logError } from "@/lib/utils/log";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedSyncRunsRepository } from "@/repositories/lightspeed-sync-runs-repo";
import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";
import {
  createArchiveLightspeedProductExecutor,
  LightspeedSyncApplyService,
} from "@/services/lightspeed-sync-apply-service";
import { LightspeedSyncReportEmailService } from "@/services/lightspeed-sync-report-email-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);

    const body = await request.json().catch(() => null);
    const parsed = lightspeedSyncApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const settingsRepo = new LightspeedSettingsRepository(supabase);
    const service = new LightspeedSyncApplyService(
      new LightspeedSyncRunsRepository(supabase),
      new LightspeedProductSyncService(supabase),
      createArchiveLightspeedProductExecutor({
        getConnectionByTenant: (resolvedTenantId) =>
          settingsRepo.getConnectionByTenant(resolvedTenantId),
      }),
      new LightspeedSyncReportEmailService(supabase),
    );

    const result = await service.applySync({
      tenantId,
      syncRunId: parsed.data.syncRunId,
      mode: parsed.data.mode,
      decisions: parsed.data.decisions,
    });

    return NextResponse.json(
      { result, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/lightspeed/sync/apply",
    });

    return NextResponse.json(
      { error: "Failed to apply sync run", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
