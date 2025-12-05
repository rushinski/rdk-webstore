// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.sendPasswordReset(email);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Reset failed" },
      { status: 400 }
    );
  }
}
