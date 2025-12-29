// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { emailOnlySchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);
  const body = await req.json().catch(() => null);
  const parsed = emailOnlySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { email } = parsed.data;
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.sendPasswordReset(email);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/forgot-password",
    });

    return NextResponse.json(
      { ok: false, error: error.message ?? "Reset failed", requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
