// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearAdminSessionCookie } from "@/lib/http/admin-session-cookie";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.signOut();

    let res = NextResponse.json({ ok: true });
    res = clearAdminSessionCookie(res);

    return res; // IMPORTANT: return the response you mutated
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Logout failed" },
      { status: 400 }
    );
  }
}
