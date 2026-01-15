import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { requireUserApi } from "@/lib/auth/session";
import { AdminInviteService } from "@/services/admin-invite-service";
import { adminInviteAcceptSchema } from "@/lib/validation/admin";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireUserApi();
    const body = await request.json().catch(() => null);
    const parsed = adminInviteAcceptSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const inviteService = new AdminInviteService(supabase, adminSupabase);

    const result = await inviteService.acceptInvite({
      userId: session.user.id,
      userEmail: session.user.email,
      token: parsed.data.token,
    });

    return NextResponse.json(
      { ok: true, role: result.role },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/invites/accept",
    });

    const message = error?.message ?? "Failed to accept invite";
    const status = message.includes("Invite") ? 400 : 500;

    return NextResponse.json(
      { error: message, requestId },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
