import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { LightspeedClient } from "@/lib/lightspeed/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lightspeedSyncPreviewSchema } from "@/lib/validation/admin";
import { logError } from "@/lib/utils/log";
import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedSyncRunsRepository } from "@/repositories/lightspeed-sync-runs-repo";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { ShippingDefaultsService } from "@/services/shipping-defaults-service";
import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const settingsRepo = new LightspeedSettingsRepository(supabase);

    const body = await request.json().catch(() => null);
    const parsed = lightspeedSyncPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const connection = await settingsRepo.getConnectionByTenant(tenantId);
    const lightspeedReader =
      connection.syncEnabled && connection.domainPrefix && connection.accessToken
        ? new LightspeedClient({
            domainPrefix: connection.domainPrefix,
            accessToken: connection.accessToken,
          })
        : undefined;

    const previewService = new LightspeedSyncPreviewService(
      new ProductRepository(supabase),
      new LightspeedLinksRepository(supabase),
      new LightspeedSyncRunsRepository(supabase),
      lightspeedReader,
      {
        parseTitle: (input) => new ProductTitleParserService(supabase).parseTitle(input),
        listShippingDefaults: (forTenantId) =>
          new ShippingDefaultsService(supabase).list(forTenantId),
      },
    );

    const preview = await previewService.previewSync({
      tenantId,
      startedBy: session.user.id,
      sourceOfTruth: parsed.data.sourceOfTruth,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
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
