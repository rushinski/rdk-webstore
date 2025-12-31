// src/proxy/auth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ProfileRepository, isAdminRole, isProfileRole } from "@/repositories/profile-repo";
import { verifyAdminSessionToken } from "@/lib/http/admin-session";
import { security } from "@/config/security";
import { log } from "@/lib/log";

export async function protectAdminRoute(
  request: NextRequest,
  requestId: string,
  supabase: SupabaseClient,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  const isAdminApi = pathname.startsWith("/api/admin");
  const adminCookieValue = request.cookies.get(
    security.proxy.adminSession.cookieName,
  )?.value;

  const respond = (
    status: number,
    apiError: string,
    pageRedirectPath: string,
  ): NextResponse => {
    if (isAdminApi) {
      return NextResponse.json({ error: apiError, requestId }, { status });
    }

    return NextResponse.redirect(new URL(pageRedirectPath, request.url));
  };

  const signOutAndClearAdminCookie = async (
    response: NextResponse,
  ): Promise<NextResponse> => {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      log({
        level: "warn",
        layer: "proxy",
        message: "admin_guard_signout_failed",
        requestId,
        route: pathname,
        event: "admin_guard",
        error:
          signOutError instanceof Error ? signOutError.message : String(signOutError),
      });
    }

    response.cookies.delete(security.proxy.adminSession.cookieName);

    return response;
  };

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_no_user_session",
      requestId,
      route: pathname,
      event: "admin_guard",
      error: userError?.message,
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath,
    );

    return adminCookieValue ? signOutAndClearAdminCookie(response) : response;
  }

  const user = userData.user;

  const profileRepo = new ProfileRepository(supabase);

  let profile: Awaited<ReturnType<typeof profileRepo.getByUserId>> | null;

  try {
    profile = await profileRepo.getByUserId(user.id);
  } catch (profileError) {
    log({
      level: "error",
      layer: "proxy",
      message: "admin_guard_profile_lookup_failed",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      error: profileError instanceof Error ? profileError.message : String(profileError),
    });

    return respond(
      security.proxy.admin.errorStatus,
      "Profile lookup failed",
      security.proxy.admin.loginPath,
    );
  }

  if (!profile) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_profile_missing",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });

    const response = respond(
      security.proxy.admin.forbiddenStatus,
      "Profile missing",
      security.proxy.admin.homePath,
    );

    return adminCookieValue ? signOutAndClearAdminCookie(response) : response;
  }

  const role = isProfileRole(profile.role) ? profile.role : "customer";
  if (!isAdminRole(role)) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_insufficient_role",
      requestId,
      route: pathname,
      userId: user.id,
      role: profile.role,
      event: "admin_guard",
    });

    const response = respond(
      security.proxy.admin.forbiddenStatus,
      "Forbidden",
      security.proxy.admin.homePath,
    );

    return adminCookieValue ? signOutAndClearAdminCookie(response) : response;
  }

  if (!adminCookieValue) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_missing_admin_cookie",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath,
    );

    return signOutAndClearAdminCookie(response);
  }

  let adminSession: Awaited<ReturnType<typeof verifyAdminSessionToken>> | null;

  try {
    adminSession = await verifyAdminSessionToken(adminCookieValue);
  } catch (verifyError) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_token_verify_error",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      error: verifyError instanceof Error ? verifyError.message : String(verifyError),
    });

    adminSession = null;
  }

  if (!adminSession) {
    log({
      level: "warn",
      layer: "proxy",
      message: "admin_guard_invalid_admin_token",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath,
    );

    return signOutAndClearAdminCookie(response);
  }

  if (adminSession.sub !== user.id) {
    log({
      level: "error",
      layer: "proxy",
      message: "admin_guard_token_user_mismatch",
      requestId,
      route: pathname,
      userId: user.id,
      tokenUserId: adminSession.sub,
      event: "admin_guard",
      severity: "SECURITY_INCIDENT",
    });

    const response = respond(
      security.proxy.admin.unauthorizedStatus,
      "Unauthorized",
      security.proxy.admin.loginPath,
    );

    return signOutAndClearAdminCookie(response);
  }

  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aalData) {
    log({
      level: "error",
      layer: "proxy",
      message: "admin_guard_mfa_state_error",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      error: aalError?.message,
    });

    return respond(
      security.proxy.admin.errorStatus,
      "MFA state error",
      security.proxy.admin.loginPath,
    );
  }

  const mfaRequired = aalData.nextLevel === "aal2";
  const mfaNotCompleted = aalData.currentLevel !== "aal2";

  if (mfaRequired && mfaNotCompleted) {
    log({
      level: "info",
      layer: "proxy",
      message: "admin_guard_mfa_required",
      requestId,
      route: pathname,
      userId: user.id,
      event: "admin_guard",
      currentLevel: aalData.currentLevel,
      requiredLevel: aalData.nextLevel,
    });

    return respond(
      security.proxy.admin.forbiddenStatus,
      "MFA required",
      security.proxy.admin.mfaChallengePath,
    );
  }

  return null;
}
