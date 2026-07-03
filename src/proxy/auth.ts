// src/proxy/auth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAdminRole, isProfileRole } from "@/config/constants/roles";
import { security } from "@/config/security";
import { log } from "@/lib/utils/log";
import { ProfileRepository } from "@/repositories/profile-repo";

export async function protectAdminRoute(
  request: NextRequest,
  requestId: string,
  supabase: SupabaseClient,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  const isAdminApi = pathname.startsWith("/api/admin");

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
  const signOut = async (response: NextResponse): Promise<NextResponse> => {
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

    return response;
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

    return signOut(response);
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

    return signOut(response);
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
