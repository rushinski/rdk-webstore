// app/api/admin/payout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { PayoutSettingsRepository } from "@/repositories/payout-settings-repo";
import { canViewBank } from "@/config/constants/roles";
import { payoutSettingsSchema } from "@/lib/validation/admin";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const body = await request.json().catch(() => null);
    const parsed = payoutSettingsSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const payoutRepo = new PayoutSettingsRepository(supabase);

    if (!canViewBank(session.role)) {
      return NextResponse.json(
        { error: "Forbidden", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
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
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/payout",
    });

    return NextResponse.json(
      { error: "Failed to update payout settings", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
