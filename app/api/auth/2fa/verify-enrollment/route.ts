// app/api/auth/2fa/verify-enrollment/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import { twoFactorVerifyEnrollmentSchema } from "@/lib/validation/auth";
import { AdminAuthService } from "@/services/admin-auth-service";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = twoFactorVerifyEnrollmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { code, factorId } = parsed.data;
    const supabase = await createSupabaseServerClient();
    const adminAuthService = new AdminAuthService(supabase);

    await adminAuthService.requireAdminUser();

    // Create challenge
    const { data: challengeData, error: challengeError } =
      await adminAuthService.startChallenge(factorId);

    if (challengeError || !challengeData) {
      return NextResponse.json(
        { error: challengeError?.message ?? "Failed to create challenge", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const challengeId = challengeData.id;

    // Verify the TOTP code
    const { error: verifyError } = await adminAuthService.verifyChallenge(
      factorId,
      challengeId,
      code,
    );

    if (verifyError) {
      return NextResponse.json(
        { error: verifyError.message ?? "Invalid code", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json<{ ok: true }>(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/2fa/verify-enrollment",
    });

    const message = error instanceof Error ? error.message : "Auth error";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    const responseError =
      message === "UNAUTHORIZED"
        ? "Unauthorized"
        : message === "FORBIDDEN"
          ? "Forbidden"
          : "Auth error";

    return NextResponse.json(
      { error: responseError, requestId },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
