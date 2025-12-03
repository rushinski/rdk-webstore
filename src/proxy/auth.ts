// src/proxy/auth.ts
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function protectAdminRoute(
  req: NextRequest,
  requestId: string,
  supabase: SupabaseClient
) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/api/");
  const isAdminApi  = pathname.startsWith("/api/admin");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. No session
  if (!user) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // 2. Profile lookup
  const repo = new ProfileRepository(supabase);
  const profile = await repo.getByUserId(user.id);

  if (!profile) {
    if (isAdminApi)
      return NextResponse.json({ error: "Profile missing", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/", req.url));
  }

  // 3. Role check
  if (profile.role !== "admin") {
    if (isAdminApi)
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/", req.url));
  }

  // 4. MFA check
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    if (isAdminApi)
      return NextResponse.json({ error: "MFA state error", requestId }, { status: 500 });

    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const mfaRequired = aalData.nextLevel === "aal2";
  const mfaNotCompleted = aalData.currentLevel !== "aal2";

  if (mfaRequired && mfaNotCompleted) {
    if (isAdminApi)
      return NextResponse.json({ error: "MFA required", requestId }, { status: 403 });

    return NextResponse.redirect(new URL("/auth/mfa/challenge", req.url));
  }

  return null;
}
