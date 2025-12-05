// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest) {
  try {
    // 1) Create the Supabase server client for this request
    const supabase = await createSupabaseServerClient();

    // 2) Inject it into the AuthService
    const authService = new AuthService(supabase);

    // 3) Perform the sign-out (session cleanup + cookie update)
    await authService.signOut();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Logout failed" },
      { status: 400 }
    );
  }
}
