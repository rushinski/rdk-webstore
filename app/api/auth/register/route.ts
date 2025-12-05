// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password, updatesOptIn } = await req.json();

    // 1) Create request-scoped Supabase client (cookie/session-bound)
    const supabase = await createSupabaseServerClient();

    // 2) Inject into service
    const authService = new AuthService(supabase);

    // 3) Perform the sign-up
    await authService.signUp(email, password, updatesOptIn);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Sign up failed" },
      { status: 400 }
    );
  }
}
