// src/proxy/auth.ts
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function protectAdminRoute(
  req: NextRequest,
  requestId: string,
  supabase: SupabaseClient
) {
  const { pathname } = req.nextUrl;

  // 1. Auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // identical as before...
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });

    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // 2. DB profile lookup
  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile) {
    if (isAdminRoute)
      return NextResponse.json({ error: "Profile missing", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/", req.url));
  }

  // 3. Admin role check
  if (profile.role !== "admin") {
    if (isAdminRoute)
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/", req.url));
  }

  // 4. MFA enforcement via Supabase AAL
  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    log({
      level: "error",
      layer: "auth",
      message: "aal_lookup_error",
      userId: user.id,
      requestId,
      route: pathname,
      status: 500,
    });

    if (isAdminRoute)
      return NextResponse.json({ error: "MFA state error", requestId }, { status: 500 });

    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const current = aalData.currentLevel;   // "aal1" or "aal2"
  const next = aalData.nextLevel;         // required level based on enrolled factors

  const mfaRequired = next === "aal2";
  const mfaNotCompleted = current !== "aal2";

  // If MFA required but user is not yet verified → redirect to challenge page
  if (mfaRequired && mfaNotCompleted) {
    // API protection
    if (isAdminRoute) {
      return NextResponse.json({ error: "MFA required", requestId }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/auth/mfa/challenge", req.url));
  }

  // All good
  return null;
}
