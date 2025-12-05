// app/api/auth/update-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.updatePassword(password);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "Password update failed" },
      { status: 400 }
    );
  }
}
