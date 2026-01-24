// app/api/auth/register/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { registerSchema } from "@/lib/validation/auth";
import { isPasswordValid } from "@/lib/validation/password";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { email, password, updatesOptIn } = parsed.data;
    if (!isPasswordValid(password)) {
      return NextResponse.json(
        { ok: false, error: "Password does not meet the required criteria.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 1) Create request-scoped Supabase client (cookie/session-bound)
    const supabase = await createSupabaseServerClient();

    // 2) Inject into service
    const authService = new AuthService(supabase);

    // 3) Perform the sign-up
    await authService.signUp(email, password, updatesOptIn);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/register",
    });

    const message = error instanceof Error ? error.message : "Sign up failed";

    return NextResponse.json(
      { ok: false, error: message, requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
