// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/auth-service";
import { clientEnv } from "@/config/client-env";

// Make sure this route is NOT running on edge
export const runtime = "nodejs";
// (optional) if you’re hitting caching weirdness
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL;

  // Allow ?next=/some/path, but never external URLs
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!code) {
    console.error("[auth/callback] Missing ?code param");
    return NextResponse.redirect(`${siteUrl}/auth/login?error=missing_oauth_code`);
  }

  const supabase = await createSupabaseServerClient();
  const authService = new AuthService(supabase);

  // 1) Exchange the code for a session (sets cookies via @supabase/ssr)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=oauth_exchange_failed`,
    );
  }

  // 2) Ensure profile exists for this (now authenticated) user.
  // For OAuth we default email marketing opt-in to FALSE, user can enable later.
  await authService.ensureProfileForCurrentUser(false);

  // 3) Redirect to final destination
  const redirectUrl = `${siteUrl}${next}`;
  return NextResponse.redirect(redirectUrl);
}
