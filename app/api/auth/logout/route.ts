// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearAdminSessionCookie } from "@/lib/http/admin-session-cookie";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.signOut();

    let res = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    res = clearAdminSessionCookie(res);

    return res; // IMPORTANT: return the response you mutated
  } catch (error: any) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/logout",
    });

    return NextResponse.json(
      { ok: false, error: error.message ?? "Logout failed", requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
