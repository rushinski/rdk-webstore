// app/api/auth/callback/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { clientEnv } from "@/config/client-env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { log, logError } from "@/lib/utils/log";

// Make sure this route is NOT running on edge
export const runtime = "nodejs";
// (optional) if you're hitting caching weirdness
export const dynamic = "force-dynamic";

const callbackSchema = z.object({
  code: z.string().trim().min(1),
  next: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { searchParams } = new URL(request.url);
  const parsed = callbackSchema.safeParse({
    code: searchParams.get("code") ?? undefined,
    next: searchParams.get("next") ?? undefined,
  });
  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL;

  // Allow ?next=/some/path, but never external URLs
  let next = parsed.success ? (parsed.data.next ?? "/") : "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!parsed.success) {
    log({
      level: "warn",
      layer: "auth",
      message: "auth_callback_missing_code",
      requestId,
    });
    return NextResponse.redirect(`${siteUrl}/auth/login?error=missing_oauth_code`);
  }

  const supabase = await createSupabaseServerClient();
  const authService = new AuthService(supabase);

  // 1) Exchange the code for a session (sets cookies via @supabase/ssr)
  const { error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);

  if (error) {
    logError(error, {
      layer: "auth",
      requestId,
      route: "/api/auth/callback",
    });
    return NextResponse.redirect(`${siteUrl}/auth/login?error=oauth_exchange_failed`);
  }

  // 2) Ensure profile exists for this (now authenticated) user.
  // For OAuth we default email marketing opt-in to FALSE, user can enable later.
  await authService.ensureProfileForCurrentUser(false);

  // 3) Redirect to final destination
  const redirectUrl = `${siteUrl}${next}`;
  return NextResponse.redirect(redirectUrl);
}
