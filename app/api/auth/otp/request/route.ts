// app/api/auth/otp/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null as any);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Email is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.requestEmailOtpForSignIn(email);

    // Important: always respond with ok=true so we don't leak whether the email exists.
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    // Generic error to avoid leaking details
    return NextResponse.json(
      { ok: false, error: "Could not send code. Please try again." },
      { status: 400 },
    );
  }
}
