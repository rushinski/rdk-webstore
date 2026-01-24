import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { PayoutSettingsRepository } from "@/repositories/payout-settings-repo";
import { canViewBank } from "@/config/constants/roles";
import { adminPreferencesSchema } from "@/lib/validation/admin";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);
    let payoutSettings = null;

    if (canViewBank(session.role)) {
      const payoutRepo = new PayoutSettingsRepository(supabase);
      try {
        payoutSettings = await payoutRepo.get();
      } catch {
        payoutSettings = null;
      }
    }

    return NextResponse.json(
      { profile, payoutSettings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/profile",
    });

    return NextResponse.json(
      { error: "Failed to load profile", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const body = await request.json().catch(() => null);
    const parsed = adminPreferencesSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);

    await profileRepo.updateNotificationPreferences(session.user.id, parsed.data);
    const profile = await profileRepo.getByUserId(session.user.id);

    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/profile",
    });

    return NextResponse.json(
      { error: "Failed to update profile", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
