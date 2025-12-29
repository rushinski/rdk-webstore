// app/api/auth/2fa/enroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthService } from "@/services/admin-auth-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const adminAuthService = new AdminAuthService(supabase);

    await adminAuthService.requireAdminUser();

    // Start MFA enrollment (TOTP) via Supabase
    const { data, error } = await adminAuthService.enrollTotp();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to start MFA enrollment", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { id: factorId, totp } = data;

    // totp.qr_code is an SVG data URL, totp.uri is the otpauth URL
    return NextResponse.json(
      {
        factorId,
        qrCode: totp.qr_code,
        uri: totp.uri,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/2fa/enroll",
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
