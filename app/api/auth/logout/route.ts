// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/utils/log";
import { AuthService } from "@/services/auth-service";

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    await authService.signOut();

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/logout",
    });

    const message = error instanceof Error ? error.message : "Logout failed";

    return NextResponse.json(
      { ok: false, error: message, requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
