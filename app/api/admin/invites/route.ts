import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireAdminApi } from "@/lib/auth/session";
import { AdminInviteService } from "@/services/admin-invite-service";
import { adminInviteCreateSchema } from "@/lib/validation/admin";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const body = await request.json().catch(() => null);
    const parsed = adminInviteCreateSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const inviteService = new AdminInviteService(supabase, adminSupabase);

    const result = await inviteService.createInvite({
      userId: session.user.id,
      role: parsed.data.role,
    });

    const inviteUrl = `${env.NEXT_PUBLIC_SITE_URL}/invite/admin?token=${result.token}`;

    return NextResponse.json(
      { invite: result.invite, inviteUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/invites",
    });

    const message = error instanceof Error ? error.message : "Failed to create invite";
    const status = message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
