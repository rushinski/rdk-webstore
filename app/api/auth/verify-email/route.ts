// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { verifyEmailSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { email, code, flow } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    const { user } = await authService.verifyEmailOtpForSignup(email, code);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired code.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const nextPath =
      flow === "signup"
        ? "/"
        : "/";

    return NextResponse.json(
      { ok: true, nextPath },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    logError(err, {
      layer: "auth",
      requestId,
      route: "/api/auth/verify-email",
    });

    return NextResponse.json(
      { ok: false, error: err?.message ?? "Could not verify code.", requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
