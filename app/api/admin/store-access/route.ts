import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeAccessSettingsSchema } from "@/lib/validation/admin";
import { logError } from "@/lib/utils/log";
import {
  DEFAULT_CHECKOUT_LOCK_MESSAGE,
  type StoreAccessSettings,
} from "@/repositories/store-access-settings-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

function normalizeSettings(input: StoreAccessSettings): StoreAccessSettings {
  return {
    siteLockEnabled: input.siteLockEnabled,
    siteUnlockAt: input.siteUnlockAt,
    checkoutLockEnabled: input.checkoutLockEnabled,
    checkoutLockMessage:
      input.checkoutLockMessage?.trim() || DEFAULT_CHECKOUT_LOCK_MESSAGE,
  };
}

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const service = new StoreAccessSettingsService(supabase);
    const settings = normalizeSettings(await service.getSettings(tenantId));

    return NextResponse.json(
      { settings, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, { layer: "api", route: "/api/admin/store-access", requestId });
    return NextResponse.json(
      { error: "Failed to load store access settings", requestId },
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
    const service = new StoreAccessSettingsService(supabase);

    const body = await request.json().catch(() => null);
    const parsed = storeAccessSettingsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const settings = normalizeSettings(
      await service.saveSettings(tenantId, {
        siteLockEnabled: parsed.data.siteLockEnabled,
        siteUnlockAt: parsed.data.siteUnlockAt ?? null,
        checkoutLockEnabled: parsed.data.checkoutLockEnabled,
        checkoutLockMessage:
          parsed.data.checkoutLockMessage?.trim() || DEFAULT_CHECKOUT_LOCK_MESSAGE,
      }),
    );

    return NextResponse.json(
      { settings, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, { layer: "api", route: "/api/admin/store-access", requestId });
    return NextResponse.json(
      { error: "Failed to save store access settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
