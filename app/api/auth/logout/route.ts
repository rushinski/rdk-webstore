// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminSessionService } from "@/services/admin-session-service";

export async function POST(_req: NextRequest) {
  try {
    // 1) Create the Supabase server client for this request
    const supabase = await createSupabaseServerClient();

    // 2) Inject it into the AuthService
    const authService = new AuthService(supabase);

    // 3) Perform the sign-out (session cleanup + cookie update)
    await authService.signOut();

    // Build response and clear admin_session cookie
    let res = NextResponse.json({ ok: true });
    res = AdminSessionService.clearAdminSessionCookie(res);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Logout failed" },
      { status: 400 }
    );
  }
}
