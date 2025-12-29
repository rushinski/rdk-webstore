// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { email, password, updatesOptIn } = parsed.data;

    // 1) Create request-scoped Supabase client (cookie/session-bound)
    const supabase = await createSupabaseServerClient();

    // 2) Inject into service
    const authService = new AuthService(supabase);

    // 3) Perform the sign-up
    await authService.signUp(email, password, updatesOptIn);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/register",
    });

    return NextResponse.json(
      { ok: false, error: error.message ?? "Sign up failed", requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
