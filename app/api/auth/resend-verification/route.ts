// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService, type VerificationFlow } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { resendVerificationSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = resendVerificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const normalizedEmail = parsed.data.email.trim();
  const verificationFlow: VerificationFlow =
    parsed.data.flow === "signin" ? "signin" : "signup";

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);
    
    await authService.resendVerification(normalizedEmail, verificationFlow);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/resend-verification",
    });

    return NextResponse.json(
      { ok: false, error: error.message ?? "Could not resend verification email.", requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
