// app/api/auth/verify-email/otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";

type VerifyFlow = "signup" | "signin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null as any);

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const flow: VerifyFlow =
    body?.flow === "signup" ? "signup" : "signin";

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, error: "Email and code are required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    const { user } = await authService.verifyEmailOtpForSignup(email, code);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired code." },
        { status: 400 },
      );
    }

    const nextPath =
      flow === "signup"
        ? "/"
        : "/";

    return NextResponse.json({ ok: true, nextPath });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Could not verify code." },
      { status: 400 },
    );
  }
}
