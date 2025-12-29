import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(_req: NextRequest) {
  const requestId = getRequestIdFromHeaders(_req.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const authService = new AuthService(supabase);

    const { user, profile } = await authService.getCurrentUserProfile();

    if (!user) {
      return NextResponse.json(
        { user: null, profile: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { user, profile },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/me",
    });
    return NextResponse.json(
      { error: "Failed to load user profile", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

