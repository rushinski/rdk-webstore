import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);

    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
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
