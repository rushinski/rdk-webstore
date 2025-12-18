// src/proxy/auth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ProfileRepository } from "@/repositories/profile-repo";
import { verifyAdminSessionToken } from "@/lib/crypto/admin-session";
import { security } from "@/config/security";
import { log } from "@/lib/log";

/**
 * Admin guard:
 * - Requires Supabase session user
 * - Requires profile role = "admin"
 * - Requires additional short-lived admin session cookie
 * - Requires MFA (AAL2) when prompted by Supabase
 *
 * Returns:
 * - NextResponse when blocked (redirect for pages / JSON for APIs)
 * - null when allowed to continue
 */
export async function protectAdminRoute(
  request: NextRequest,
  requestId: string,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Only used to choose response type (JSON for admin APIs, redirect for pages).
  const isAdminApi = pathname.startsWith("/api/admin");

  const respond = (status: number, apiError: string, pageRedirectPath: string) => {
    if (isAdminApi) {
      return NextResponse.json({ error: apiError, requestId }, { status });
    }
    return NextResponse.redirect(new URL(pageRedirectPath, request.url));
  };

  const signOutAndClearAdminCookie = async (res: NextResponse) => {
    // Fail-closed: if signOut fails, still clear cookie + block.
    try {
      await supabase.auth.signOut();
    } catch {
      log({
        level: "warn",
        layer: "proxy",
        message: "admin_guard_signout_failed",
        requestId,
        route: pathname,
        event: "admin_guard",
      });
    }

    res.cookies.delete(security.proxy.adminSession.cookieName);
    return res;
  };

  // 1) Require a Supabase user session
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );
  }

  const user = userData.user;

  // 2) Require profile with admin role
  const repo = new ProfileRepository(supabase);

  let profile: Awaited<ReturnType<typeof repo.getByUserId>> | null;
  try {
    profile = await repo.getByUserId(user.id);
  } catch {
    return respond(
      security.proxy.admin.errorStatus,
      "Profile lookup failed",
      security.proxy.admin.loginPath
    );
  }

  if (!profile) {
    return respond(
      security.proxy.admin.forbiddenStatus,
      "Profile missing",
      security.proxy.admin.homePath
    );
  }

  if (profile.role !== "admin") {
    return respond(
      security.proxy.admin.forbiddenStatus,
      "Forbidden",
      security.proxy.admin.homePath
    );
  }

  // 3) Require admin session cookie (additional short-lived token)
  const adminCookieValue = request.cookies.get(security.proxy.adminSession.cookieName)?.value;

  if (!adminCookieValue) {
    const res = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );
    return signOutAndClearAdminCookie(res);
  }

  // 4) Validate admin session token (and bind to Supabase user id)
  let adminSession: Awaited<ReturnType<typeof verifyAdminSessionToken>> | null;
  try {
    adminSession = await verifyAdminSessionToken(adminCookieValue);
  } catch {
    adminSession = null;
  }

  if (!adminSession) {
    const res = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );
    return signOutAndClearAdminCookie(res);
  }

  if (adminSession.sub !== user.id) {
    const res = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath
    );
    return signOutAndClearAdminCookie(res);
  }

  // 5) Require MFA (AAL2) if Supabase indicates it is required
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aalData) {
    return respond(
      security.proxy.admin.errorStatus,
      "MFA state error",
      security.proxy.admin.loginPath
    );
  }

  const mfaRequired = aalData.nextLevel === "aal2";
  const mfaNotCompleted = aalData.currentLevel !== "aal2";

  if (mfaRequired && mfaNotCompleted) {
    return respond(
      security.proxy.admin.forbiddenStatus,
      "MFA required",
      security.proxy.admin.mfaChallengePath
    );
  }

  return null;
}
