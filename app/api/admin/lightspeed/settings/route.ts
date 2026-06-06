import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import { lightspeedSettingsSchema } from "@/lib/validation/admin";
import {
  LightspeedSettingsRepository,
  type LightspeedSettings,
} from "@/repositories/lightspeed-settings-repo";

function normalizeSettings(input: LightspeedSettings): LightspeedSettings {
  return {
    syncEnabled: input.syncEnabled,
    domainPrefix: input.domainPrefix?.trim() || null,
  };
}

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const repo = new LightspeedSettingsRepository(supabase);
    const settings = normalizeSettings(await repo.getByTenant(tenantId));

    return NextResponse.json(
      { settings, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      route: "/api/admin/lightspeed/settings",
      requestId,
    });
    return NextResponse.json(
      { error: "Failed to load Lightspeed settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const repo = new LightspeedSettingsRepository(supabase);

    const body = await request.json().catch(() => null);
    const parsed = lightspeedSettingsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const settings = normalizeSettings(
      await repo.upsert(tenantId, {
        syncEnabled: parsed.data.syncEnabled,
        domainPrefix: parsed.data.domainPrefix ?? null,
      }),
    );

    return NextResponse.json(
      { settings, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      route: "/api/admin/lightspeed/settings",
      requestId,
    });
    return NextResponse.json(
      { error: "Failed to save Lightspeed settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
