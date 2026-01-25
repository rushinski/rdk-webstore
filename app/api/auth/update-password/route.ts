// app/api/auth/update-password/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { updatePasswordSchema } from "@/lib/validation/auth";
import { isPasswordValid } from "@/lib/validation/password";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = updatePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { password } = parsed.data;
    if (!isPasswordValid(password)) {
      return NextResponse.json(
        { ok: false, error: "Password does not meet the required criteria.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.updatePassword(password);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/update-password",
    });

    const message = error instanceof Error ? error.message : "Password update failed";

    return NextResponse.json(
      { ok: false, error: message, requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
