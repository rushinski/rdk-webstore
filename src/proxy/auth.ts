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

  // Get Authenticated User (SSR-safe)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_access_denied_no_session",
      requestId,
      route: pathname,
      status: 401,
      event: "admin_guard",
    });

    if (pathname.startsWith("/api"))
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });

    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Authoritative DB-backed Profile Lookup
  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile) {
    log({
      level: "error",
      layer: "auth",
      message: "admin_profile_missing",
      userId: user.id,
      requestId,
      route: pathname,
      status: 403,
      event: "admin_guard",
    });

    if (pathname.startsWith("/api"))
      return NextResponse.json({ error: "Profile missing", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/", req.url));
  }

  const { role, twofa_enabled } = profile;

  // Role Enforcement
  if (role !== "admin") {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_access_denied_wrong_role",
      userId: user.id,
      role,
      requestId,
      route: pathname,
      status: 403,
      event: "admin_guard",
    });

    if (pathname.startsWith("/api/admin"))
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/", req.url));
  }

  // Mandatory 2FA Enforcement for Admins
  if (!twofa_enabled) {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_2fa_not_enabled",
      userId: user.id,
      role,
      requestId,
      route: pathname,
      status: 403,
      event: "admin_guard",
    });

    if (pathname.startsWith("/api/admin"))
      return NextResponse.json({ error: "2FA required", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/auth/setup-2fa", req.url));
  }

  // Success: Admin Authenticated & Verified
  return null; // allow
}
