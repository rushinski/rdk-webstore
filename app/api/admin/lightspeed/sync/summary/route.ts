import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { LightspeedClient } from "@/lib/lightspeed/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lightspeedSyncSummarySchema } from "@/lib/validation/admin";
import { logError } from "@/lib/utils/log";
import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedSyncRunsRepository } from "@/repositories/lightspeed-sync-runs-repo";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { ShippingDefaultsService } from "@/services/shipping-defaults-service";
import { LightspeedSyncPreviewService } from "@/services/lightspeed-sync-preview-service";

function buildPreviewService(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  connection: {
    syncEnabled: boolean;
    domainPrefix: string | null;
    accessToken: string | null;
  },
) {
  const parserService = new ProductTitleParserService(supabase);
  const shippingDefaultsService = new ShippingDefaultsService(supabase);
  const lightspeedReader =
    connection.syncEnabled && connection.domainPrefix && connection.accessToken
      ? new LightspeedClient({
          domainPrefix: connection.domainPrefix,
          accessToken: connection.accessToken,
        })
      : undefined;

  return new LightspeedSyncPreviewService(
    new ProductRepository(supabase),
    new LightspeedLinksRepository(supabase),
    new LightspeedSyncRunsRepository(supabase),
    lightspeedReader,
    {
      parseTitle: (input) => parserService.parseTitle(input),
      listShippingDefaults: (forTenantId) => shippingDefaultsService.list(forTenantId),
    },
  );
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const settingsRepo = new LightspeedSettingsRepository(supabase);
    const runsRepo = new LightspeedSyncRunsRepository(supabase);

    const body = await request.json().catch(() => null);
    const parsed = lightspeedSyncSummarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const run = await runsRepo.createRun({
      tenantId,
      startedBy: session.user.id,
      sourceOfTruth: parsed.data.sourceOfTruth,
      status: "summary_pending",
      summary: {},
    });

    const connection = await settingsRepo.getConnectionByTenant(tenantId);
    const previewService = buildPreviewService(supabase, connection);

    void (async () => {
      try {
        const summary = await previewService.summarizeSync({
          tenantId,
          sourceOfTruth: parsed.data.sourceOfTruth,
          pageSize: parsed.data.pageSize,
        });

        await runsRepo.updateRun(run.id, {
          status: "summary_complete",
          summary,
          completedAt: new Date().toISOString(),
        });
      } catch (error) {
        logError(error, {
          layer: "job",
          requestId,
          route: "/api/admin/lightspeed/sync/summary",
        });

        await runsRepo.updateRun(run.id, {
          status: "summary_failed",
          summary: {},
          completedAt: new Date().toISOString(),
        });
      }
    })();

    return NextResponse.json(
      { syncRunId: run.id, status: "summary_pending", requestId },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/lightspeed/sync/summary",
    });

    return NextResponse.json(
      { error: "Failed to start sync summary", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    await ensureTenantId(session, supabase);
    const runsRepo = new LightspeedSyncRunsRepository(supabase);

    const syncRunId = new URL(request.url).searchParams.get("syncRunId");
    if (!syncRunId) {
      return NextResponse.json(
        { error: "syncRunId is required", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const run = await runsRepo.getRun(syncRunId);
    if (!run) {
      return NextResponse.json(
        { error: "Summary run not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        syncRunId,
        status: run.status,
        summary:
          run.status === "summary_complete"
            ? (run.summary as Record<string, unknown>)
            : null,
        requestId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/lightspeed/sync/summary",
    });

    return NextResponse.json(
      { error: "Failed to load sync summary", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
