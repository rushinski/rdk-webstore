// src/proxy/auth.ts
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";

export async function protectAdminRoute(
  req: NextRequest,
  requestId: string,
  supabase: SupabaseClient
) {
  const { pathname } = req.nextUrl;

  const {
    data: { user },
  } = await supabase.auth.getUser(); // ✅ SSR-safe read

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

  const role = user.user_metadata?.role ?? "customer";
  const twofa = user.user_metadata?.twofa_enabled ?? false;

  if (role !== "admin") {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_access_denied_wrong_role",
      requestId,
      route: pathname,
      status: 403,
      event: "admin_guard",
      userId: user.id,
      role,
    });

    if (pathname.startsWith("/api/admin"))
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });

    return NextResponse.redirect("/");
  }

  if (!twofa) {
    log({
      level: "warn",
      layer: "auth",
      message: "admin_2fa_not_enabled",
      requestId,
      route: pathname,
      status: 403,
      event: "admin_guard",
      userId: user.id,
      role,
    });

    if (pathname.startsWith("/api/admin"))
      return NextResponse.json({ error: "2FA required", requestId }, { status: 403 });

    return NextResponse.redirect("/auth/setup-2fa");
  }

  return null; // allow
}
