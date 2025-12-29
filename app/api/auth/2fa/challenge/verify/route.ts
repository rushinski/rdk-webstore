// app/api/auth/2fa/challenge/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setAdminSessionCookie } from "@/lib/http/admin-session-cookie";
import { AdminAuthService } from "@/services/admin-auth-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { twoFactorChallengeVerifySchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = twoFactorChallengeVerifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { factorId, challengeId, code } = parsed.data;
    const supabase = await createSupabaseServerClient();
    const adminAuthService = new AdminAuthService(supabase);

    const { userId } = await adminAuthService.requireAdminUser();

    const { error: verifyError } = await adminAuthService.verifyChallenge(
      factorId,
      challengeId,
      code
    );

    if (verifyError) {
      return NextResponse.json(
        { error: verifyError.message, requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let res = NextResponse.json<{ ok: true; isAdmin: true }>(
      {
        ok: true,
        isAdmin: true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    res = await setAdminSessionCookie(res, userId);

    return res;
  } catch (error) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/2fa/challenge/verify",
    });

    const message = error instanceof Error ? error.message : "Auth error";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    const responseError =
      message === "UNAUTHORIZED"
        ? "Unauthorized"
        : message === "FORBIDDEN"
          ? "Forbidden"
          : "Auth error";

    return NextResponse.json(
      { error: responseError, requestId },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
