// app/api/auth/forgot-password/verify-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null as any);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: "Email and code are required" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.verifyPasswordResetCode(email, code);

    // At this point, Supabase has established a recovery session
    // so /api/auth/update-password can successfully call updateUser().
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Invalid or expired code",
      },
      { status: 400 },
    );
  }
}
