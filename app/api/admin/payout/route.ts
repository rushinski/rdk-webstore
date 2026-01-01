// app/api/admin/payout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { PayoutSettingsRepository } from "@/repositories/payout-settings-repo";
import { ProfileRepository, isSuperAdminRole, isProfileRole } from "@/repositories/profile-repo";
import { payoutSettingsSchema } from "@/lib/validation/admin";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const body = await request.json().catch(() => null);
    const parsed = payoutSettingsSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);
    const payoutRepo = new PayoutSettingsRepository(supabase);

    const profile = await profileRepo.getByUserId(session.user.id);
    const role = isProfileRole(profile?.role) ? profile!.role : "customer";

    const isSuperAdmin = isSuperAdminRole(role);
    const isPrimary = profile?.is_primary_admin === true;

    if (!isSuperAdmin && !isPrimary) {
      return NextResponse.json(
        { error: "Forbidden", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const existing = await payoutRepo.get();
    const primaryAdminId = existing?.primary_admin_id ?? session.user.id;

    const payoutSettings = await payoutRepo.upsert({
      primaryAdminId,
      provider: parsed.data.provider,
      accountLabel: parsed.data.account_label,
      accountLast4: parsed.data.account_last4,
    });

    return NextResponse.json(
      { payoutSettings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/payout",
    });

    return NextResponse.json(
      { error: "Failed to update payout settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
